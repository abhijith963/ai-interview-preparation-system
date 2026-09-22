import {
  ADAPTIVE_CONFIG,
  DEFAULT_INTERVIEW_MODE,
  SCORING_CONFIG,
  computeVoiceMetrics,
} from '@ai-interview/shared';
import mongoose from 'mongoose';

import { AppError } from '../../lib/app-error.js';
import { recomputeRoleAnalytics } from '../analytics/analytics.service.js';
import { Resume } from '../resumes/resume.model.js';
import {
  calculateAnswerScore,
  calculatePerformanceSignal,
  calculateSessionResult,
  determineNextDifficulty,
} from './interview.calculations.js';
import {
  toAnswerResult,
  toInterviewReport,
  toSessionView,
} from './interview.dto.js';
import { InterviewSession } from './interview.model.js';
import {
  buildConfirmedResumeClaims,
  buildQuestionContext,
  getRoleProfile,
  selectQuestionTarget,
  validateEvaluation,
  validateGeneratedQuestion,
} from './interview.policy.js';

const notFound = () =>
  new AppError(404, 'INTERVIEW_NOT_FOUND', 'The interview session was not found.');

const getOwnedInterview = async (interviewId, userId) => {
  if (!mongoose.isValidObjectId(interviewId)) throw notFound();
  const interview = await InterviewSession.findOne({ _id: interviewId, userId });
  if (!interview) throw notFound();
  return interview;
};

const toHistoryItem = (interview) => ({
  answeredCount: interview.items.filter(({ evaluation }) => evaluation).length,
  canOpenResult: ['COMPLETED', 'ENDED_EARLY'].includes(interview.status),
  completedAt: interview.completedAt,
  createdAt: interview.createdAt,
  endedEarlyAt: interview.endedEarlyAt,
  id: interview._id.toString(),
  questionCount: interview.questionCount,
  role: {
    domain: interview.roleDomain,
    id: interview.roleId,
    label: interview.roleLabel,
  },
  score: interview.result?.overallSessionScore ?? null,
  startedAt: interview.startedAt,
  status: interview.status,
  updatedAt: interview.updatedAt,
});

const safeOperationError = (error, interviewId) => {
  const code = error.code ?? 'AI_PROVIDER_FAILED';
  const status = code === 'AI_OUTPUT_INVALID' ? 502 : 503;
  return new AppError(
    status,
    code,
    code === 'AI_OUTPUT_INVALID'
      ? 'The AI response could not be validated. Retry this interview step.'
      : 'The AI interview service is temporarily unavailable. Retry this interview step.',
    { interviewId: interviewId.toString(), retryable: true },
  );
};

const markError = async (interview, { error, failedOperation, resumeState }) => {
  interview.status = 'ERROR';
  interview.error = {
    code: error.code ?? 'AI_PROVIDER_FAILED',
    failedOperation,
    message:
      failedOperation === 'GENERATE_QUESTION'
        ? 'Question generation did not complete. Your existing interview data is safe.'
        : 'Answer evaluation did not complete. Your answer is saved without a score.',
    occurredAt: new Date(),
    resumeState,
  };
  await interview.save();
  throw safeOperationError(error, interview._id);
};

const runPolicyValidatedOperation = async ({ operation, validate }) => {
  let lastValidationError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const output = await operation();
    try {
      return validate(output);
    } catch (error) {
      if (error.code !== 'AI_OUTPUT_INVALID') throw error;
      lastValidationError = error;
    }
  }
  throw lastValidationError;
};

const findDuplicateSubmission = (interview, { idempotencyKey, questionId }) => {
  const reusedKey = interview.items.find(
    (item) => item.answer?.idempotencyKey === idempotencyKey,
  );
  if (reusedKey && reusedKey._id.toString() !== questionId) {
    throw new AppError(
      409,
      'IDEMPOTENCY_KEY_REUSED',
      'Use a new submission key for each question.',
    );
  }
  return interview.items.find(
    (item) =>
      item._id.toString() === questionId &&
      item.answer?.idempotencyKey === idempotencyKey,
  );
};

export const createInterviewService = ({ aiGateway }) => {
  const generateQuestion = async (interview) => {
    const role = getRoleProfile(interview.roleId);
    const target = selectQuestionTarget({ interview, role });
    const context = buildQuestionContext({ interview, role, target });

    try {
      const question = await runPolicyValidatedOperation({
        operation: () => aiGateway.generateQuestion(context),
        validate: (output) => validateGeneratedQuestion({ context, output }),
      });
      interview.items.push({
        ...question,
        position: context.position,
        resumeClaim: target.resumeClaim
          ? {
              claimId: target.resumeClaim.claimId,
              section: target.resumeClaim.section,
              text: target.resumeClaim.text,
            }
          : null,
      });
      interview.currentQuestionIndex = interview.items.length - 1;
      interview.status = 'AWAITING_ANSWER';
      interview.error = null;
      await interview.save();
      return interview;
    } catch (error) {
      return markError(interview, {
        error,
        failedOperation: 'GENERATE_QUESTION',
        resumeState: 'GENERATING_QUESTION',
      });
    }
  };

  const evaluateCurrentAnswer = async (interview) => {
    const item = interview.items[interview.currentQuestionIndex];
    const role = getRoleProfile(interview.roleId);
    const context = {
      answerText: item.answer.text,
      question: {
        difficulty: item.difficulty,
        primaryCategoryId: item.primaryCategoryId,
        primarySkillId: item.primarySkillId,
        questionText: item.questionText,
        questionType: item.questionType,
        resumeClaim: item.resumeClaim,
        rubric: item.rubric,
        secondarySkillIds: item.secondarySkillIds,
      },
      role: {
        domain: role.domain,
        id: role.id,
        label: role.label,
      },
    };

    let validatedEvaluation;
    try {
      validatedEvaluation = await runPolicyValidatedOperation({
        operation: () => aiGateway.evaluateAnswer(context),
        validate: (output) => validateEvaluation({ context, output }),
      });
    } catch (error) {
      return markError(interview, {
        error,
        failedOperation: 'EVALUATE_ANSWER',
        resumeState: 'EVALUATING_ANSWER',
      });
    }

    const answerScore = calculateAnswerScore(validatedEvaluation.dimensionScores);
    const performanceSignal = calculatePerformanceSignal({
      answerScore,
      technicalAccuracy: validatedEvaluation.dimensionScores.technicalAccuracy,
    });
    item.evaluation = {
      ...validatedEvaluation,
      answerScore,
      evaluatedAt: new Date(),
      performanceSignal,
      promptVersion: aiGateway.promptVersions.evaluation,
      providerModel: aiGateway.model,
    };
    const evaluatedItems = interview.items.filter(({ evaluation }) => evaluation);
    const transition = determineNextDifficulty({
      currentDifficulty: item.difficulty,
      evaluatedItems,
      primarySkillId: item.primarySkillId,
    });
    item.difficultyTransition = transition;
    interview.currentDifficulty = transition.to;

    if (evaluatedItems.length === interview.questionCount) {
      interview.result = calculateSessionResult(interview.items, { isComplete: true });
      interview.status = 'COMPLETED';
      interview.completedAt = new Date();
      interview.error = null;
      await interview.save();
      await recomputeRoleAnalytics({
        roleId: interview.roleId,
        userId: interview.userId,
      });
      return { interview, item };
    }

    interview.status = 'GENERATING_QUESTION';
    interview.error = null;
    await interview.save();
    await generateQuestion(interview);
    return { interview, item };
  };

  return Object.freeze({
    async createInterview({ mediaConsent, mode = DEFAULT_INTERVIEW_MODE, roleId, useResume, user }) {
      if (!user.selectedRoleId) {
        throw new AppError(
          422,
          'ROLE_REQUIRED',
          'Select and save a target role before starting an interview.',
        );
      }
      if (user.selectedRoleId !== roleId) {
        throw new AppError(
          409,
          'ROLE_SELECTION_CHANGED',
          'Save the selected role before starting the interview.',
        );
      }
      const role = getRoleProfile(roleId);
      if (!role) {
        throw new AppError(422, 'ROLE_INVALID', 'Select one of the approved roles.');
      }

      const resume = useResume
        ? await Resume.findOne({ userId: user._id, status: 'CONFIRMED' })
        : null;
      if (useResume && !resume) {
        throw new AppError(
          422,
          'CONFIRMED_RESUME_REQUIRED',
          'Confirm an active resume or start a role-only interview.',
        );
      }
      const resumeClaims = buildConfirmedResumeClaims(resume);
      if (useResume && !resumeClaims.length) {
        throw new AppError(
          422,
          'RESUME_CLAIMS_REQUIRED',
          'The confirmed resume has no suitable project, experience, skill, education, or certification details.',
        );
      }

      if (mode === 'VOICE' && !mediaConsent?.microphone) {
        throw new AppError(
          422,
          'MICROPHONE_CONSENT_REQUIRED',
          'Voice interviews need microphone consent. You can still start a text interview.',
        );
      }

      if (mode === 'VIDEO' && (!mediaConsent?.camera || !mediaConsent?.microphone)) {
        throw new AppError(
          422,
          'CAMERA_AND_MICROPHONE_CONSENT_REQUIRED',
          'Video interviews need camera and microphone consent. You can still start a text or voice interview.',
        );
      }

      const interview = await InterviewSession.create({
        configVersions: {
          adaptive: ADAPTIVE_CONFIG.version,
          evaluationPrompt: aiGateway.promptVersions.evaluation,
          questionPrompt: aiGateway.promptVersions.question,
          scoring: SCORING_CONFIG.version,
        },
        currentDifficulty: ADAPTIVE_CONFIG.initialDifficulty,
        mediaConsent: {
          camera: Boolean(mediaConsent?.camera),
          microphone: Boolean(mediaConsent?.microphone),
        },
        mode,
        resumeClaims,
        resumeId: resume?._id ?? null,
        roleDomain: role.domain,
        roleId: role.id,
        roleLabel: role.label,
        roleProfileVersion: role.version,
        status: 'CREATED',
        useResume,
        userId: user._id,
      });
      interview.status = 'GENERATING_QUESTION';
      interview.startedAt = new Date();
      await interview.save();
      await generateQuestion(interview);
      return toSessionView(interview);
    },

    async endInterviewEarly({ interviewId, userId }) {
      const interview = await getOwnedInterview(interviewId, userId);
      if (['COMPLETED', 'ENDED_EARLY'].includes(interview.status)) {
        throw new AppError(409, 'INTERVIEW_TERMINAL', 'This interview has already ended.');
      }
      if (['GENERATING_QUESTION', 'EVALUATING_ANSWER'].includes(interview.status)) {
        throw new AppError(
          409,
          'INTERVIEW_PROCESSING',
          'Wait for the current interview operation before ending the session.',
        );
      }
      interview.result = calculateSessionResult(interview.items, { isComplete: false });
      interview.status = 'ENDED_EARLY';
      interview.endedEarlyAt = new Date();
      interview.error = null;
      await interview.save();
      return toInterviewReport(interview);
    },

    async getInterview({ interviewId, userId }) {
      const interview = await getOwnedInterview(interviewId, userId);
      return toSessionView(interview);
    },

    async listInterviews({ page, pageSize, roleId, status, userId }) {
      const filter = { userId };
      if (roleId) filter.roleId = roleId;
      if (status) filter.status = status;
      const [interviews, totalItems] = await Promise.all([
        InterviewSession.find(filter)
          .sort({ createdAt: -1, _id: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize),
        InterviewSession.countDocuments(filter),
      ]);
      return {
        items: interviews.map(toHistoryItem),
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
        },
      };
    },

    async deleteInterview({ interviewId, userId }) {
      const interview = await getOwnedInterview(interviewId, userId);
      const roleId = interview.roleId;
      const roleLabel = interview.roleLabel;
      const recalculated = interview.status === 'COMPLETED';
      await InterviewSession.deleteOne({ _id: interview._id, userId });
      if (recalculated) {
        await recomputeRoleAnalytics({ roleId, userId });
      }
      return {
        deletedInterviewId: interview._id.toString(),
        recalculated,
        role: { id: roleId, label: roleLabel },
      };
    },

    async getReport({ interviewId, userId }) {
      const interview = await getOwnedInterview(interviewId, userId);
      if (!['COMPLETED', 'ENDED_EARLY'].includes(interview.status)) {
        throw new AppError(
          409,
          'INTERVIEW_NOT_FINISHED',
          'Complete or end the interview before opening its result.',
        );
      }
      return toInterviewReport(interview);
    },

    async retryInterview({ interviewId, userId }) {
      const existing = await getOwnedInterview(interviewId, userId);
      if (existing.status !== 'ERROR') {
        throw new AppError(
          409,
          'INTERVIEW_NOT_RETRYABLE',
          'This interview does not have a failed operation to retry.',
        );
      }
      const failedOperation = existing.error.failedOperation;
      const resumed = await InterviewSession.findOneAndUpdate(
        { _id: existing._id, status: 'ERROR', userId },
        { $set: { error: null, status: existing.error.resumeState } },
        { returnDocument: 'after', runValidators: true },
      );
      if (!resumed) {
        throw new AppError(
          409,
          'INTERVIEW_RETRY_CONFLICT',
          'This interview operation is already being retried.',
        );
      }
      if (failedOperation === 'GENERATE_QUESTION') {
        await generateQuestion(resumed);
        const view = toSessionView(resumed);
        return {
          evaluation: view.lastEvaluation,
          nextQuestion: view.currentQuestion,
          session: view.session,
        };
      }
      const { interview, item } = await evaluateCurrentAnswer(resumed);
      return toAnswerResult(interview, item);
    },

    async submitAnswer({
      answerText,
      durationMs,
      idempotencyKey,
      interviewId,
      questionId,
      source = 'TYPED',
      userId,
    }) {
      const existing = await getOwnedInterview(interviewId, userId);
      const duplicate = findDuplicateSubmission(existing, { idempotencyKey, questionId });
      if (duplicate?.evaluation) return toAnswerResult(existing, duplicate);
      if (duplicate) {
        throw new AppError(
          409,
          existing.status === 'ERROR' ? 'ANSWER_RETRY_REQUIRED' : 'ANSWER_PROCESSING',
          existing.status === 'ERROR'
            ? 'The saved answer is awaiting an evaluation retry.'
            : 'This answer submission is still being processed.',
          { retryable: true },
        );
      }
      if (existing.status !== 'AWAITING_ANSWER') {
        throw new AppError(
          409,
          'INTERVIEW_NOT_ACCEPTING_ANSWER',
          'This interview is not currently accepting an answer.',
        );
      }
      const itemIndex = existing.currentQuestionIndex;
      const currentItem = existing.items[itemIndex];
      if (currentItem._id.toString() !== questionId) {
        throw new AppError(
          409,
          'QUESTION_MISMATCH',
          'The submitted answer does not match the current question.',
        );
      }

      const accepted = await InterviewSession.findOneAndUpdate(
        {
          _id: existing._id,
          [`items.${itemIndex}._id`]: currentItem._id,
          [`items.${itemIndex}.answer`]: null,
          status: 'AWAITING_ANSWER',
          userId,
        },
        {
          $set: {
            [`items.${itemIndex}.answer`]: {
              durationMs: durationMs ?? null,
              idempotencyKey,
              source,
              submittedAt: new Date(),
              text: answerText,
              voiceMetrics:
                source === 'VOICE_TRANSCRIPT'
                  ? computeVoiceMetrics({ durationMs: durationMs ?? 0, transcript: answerText })
                  : null,
            },
            status: 'EVALUATING_ANSWER',
          },
        },
        { returnDocument: 'after', runValidators: true },
      );
      if (!accepted) {
        const concurrent = await getOwnedInterview(interviewId, userId);
        const concurrentDuplicate = findDuplicateSubmission(concurrent, {
          idempotencyKey,
          questionId,
        });
        if (concurrentDuplicate?.evaluation) {
          return toAnswerResult(concurrent, concurrentDuplicate);
        }
        throw new AppError(
          409,
          'ANSWER_PROCESSING',
          'The answer was already accepted and is being processed.',
          { retryable: true },
        );
      }

      const { interview, item } = await evaluateCurrentAnswer(accepted);
      return toAnswerResult(interview, item);
    },
  });
};
