import {
  DIFFICULTY_LEVELS,
  INTERVIEW_SESSION_STATES,
} from '@ai-interview/shared';
import mongoose from 'mongoose';

const dimensionScoresDefinition = {
  technicalAccuracy: { type: Number, min: 0, max: 5, required: true },
  responseRelevance: { type: Number, min: 0, max: 5, required: true },
  logicalStructure: { type: Number, min: 0, max: 5, required: true },
  communicationClarity: { type: Number, min: 0, max: 5, required: true },
  professionalCertainty: { type: Number, min: 0, max: 5, required: true },
};

const dimensionEvidenceDefinition = {
  technicalAccuracy: { type: String, required: true },
  responseRelevance: { type: String, required: true },
  logicalStructure: { type: String, required: true },
  communicationClarity: { type: String, required: true },
  professionalCertainty: { type: String, required: true },
};

const resumeClaimSchema = new mongoose.Schema(
  {
    claimId: { type: String, required: true },
    section: { type: String, required: true },
    text: { type: String, required: true, maxlength: 500 },
  },
  { _id: false },
);

const evaluationSchema = new mongoose.Schema(
  {
    dimensionScores: { type: dimensionScoresDefinition, required: true },
    dimensionEvidence: { type: dimensionEvidenceDefinition, required: true },
    strengths: { type: [String], default: [] },
    missingOrIncorrectPoints: { type: [String], default: [] },
    improvementAdvice: { type: [String], default: [] },
    skillEvidence: {
      primarySkillDemonstrated: { type: Boolean, required: true },
      demonstratedSecondarySkillIds: { type: [String], default: [] },
    },
    resumeConsistency: {
      status: {
        type: String,
        enum: [
          'SUPPORTED',
          'NEEDS_CLARIFICATION',
          'INCONSISTENT',
          'NOT_APPLICABLE',
        ],
        required: true,
      },
      claimId: { type: String, default: null },
      explanation: { type: String, default: null },
    },
    quality: {
      answerWasBlank: { type: Boolean, required: true },
      answerWasUnscorable: { type: Boolean, required: true },
      uncertaintyReason: { type: String, default: null },
    },
    answerScore: { type: Number, min: 0, max: 100, required: true },
    performanceSignal: { type: Number, min: 0, max: 100, required: true },
    providerModel: { type: String, required: true },
    promptVersion: { type: String, required: true },
    evaluatedAt: { type: Date, required: true },
  },
  { _id: false },
);

const interviewItemSchema = new mongoose.Schema({
  position: { type: Number, required: true, min: 1, max: 10 },
  questionText: { type: String, required: true, maxlength: 800 },
  questionType: {
    type: String,
    enum: ['ROLE_DOMAIN', 'RESUME_PROJECT'],
    required: true,
  },
  difficulty: { type: String, enum: DIFFICULTY_LEVELS, required: true },
  primaryCategoryId: { type: String, required: true },
  primarySkillId: { type: String, required: true },
  secondarySkillIds: { type: [String], default: [] },
  rubric: {
    expectedConcepts: { type: [String], required: true },
    acceptableAlternatives: { type: [String], default: [] },
    commonMistakes: { type: [String], default: [] },
  },
  resumeClaim: { type: resumeClaimSchema, default: null },
  answer: {
    type: new mongoose.Schema(
      {
        text: { type: String, required: true, maxlength: 10_000 },
        idempotencyKey: { type: String, required: true, maxlength: 120 },
        submittedAt: { type: Date, required: true },
      },
      { _id: false },
    ),
    default: null,
  },
  evaluation: { type: evaluationSchema, default: null },
  difficultyTransition: {
    type: new mongoose.Schema(
      {
        from: { type: String, enum: DIFFICULTY_LEVELS, required: true },
        to: { type: String, enum: DIFFICULTY_LEVELS, required: true },
        decision: { type: String, enum: ['INCREASE', 'HOLD', 'DECREASE'], required: true },
        reason: { type: String, required: true },
        windowSignals: { type: [Number], default: [] },
        evidenceSource: { type: String, enum: ['SAME_SKILL', 'SESSION'], required: true },
      },
      { _id: false },
    ),
    default: null,
  },
});

const dimensionResultSchema = new mongoose.Schema(
  {
    averageRaw: { type: Number, min: 0, max: 5, required: true },
    normalizedScore: { type: Number, min: 0, max: 100, required: true },
  },
  { _id: false },
);

const interviewSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', default: null },
    useResume: { type: Boolean, required: true },
    resumeClaims: { type: [resumeClaimSchema], default: [] },
    roleId: { type: String, required: true },
    roleLabel: { type: String, required: true },
    roleDomain: { type: String, required: true },
    roleProfileVersion: { type: String, required: true },
    status: { type: String, enum: INTERVIEW_SESSION_STATES, default: 'CREATED' },
    questionCount: { type: Number, default: 10, immutable: true },
    currentQuestionIndex: { type: Number, default: -1, min: -1, max: 9 },
    currentDifficulty: { type: String, enum: DIFFICULTY_LEVELS, required: true },
    items: {
      type: [interviewItemSchema],
      default: [],
      validate: {
        validator: (items) => items.length <= 10,
        message: 'An interview may contain at most 10 questions.',
      },
    },
    error: {
      type: new mongoose.Schema(
        {
          code: { type: String, required: true },
          failedOperation: {
            type: String,
            enum: ['GENERATE_QUESTION', 'EVALUATE_ANSWER'],
            required: true,
          },
          resumeState: {
            type: String,
            enum: ['GENERATING_QUESTION', 'EVALUATING_ANSWER'],
            required: true,
          },
          message: { type: String, required: true },
          occurredAt: { type: Date, required: true },
        },
        { _id: false },
      ),
      default: null,
    },
    result: {
      type: new mongoose.Schema(
        {
          isComplete: { type: Boolean, required: true },
          overallSessionScore: { type: Number, min: 0, max: 100, required: true },
          completedQuestionCount: { type: Number, min: 0, max: 10, required: true },
          dimensionBreakdown: {
            technicalAccuracy: { type: dimensionResultSchema, required: true },
            responseRelevance: { type: dimensionResultSchema, required: true },
            logicalStructure: { type: dimensionResultSchema, required: true },
            communicationClarity: { type: dimensionResultSchema, required: true },
            professionalCertainty: { type: dimensionResultSchema, required: true },
          },
          strengths: { type: [String], default: [] },
          areasToImprove: { type: [String], default: [] },
          generatedAt: { type: Date, required: true },
        },
        { _id: false },
      ),
      default: null,
    },
    configVersions: {
      scoring: { type: String, required: true },
      adaptive: { type: String, required: true },
      questionPrompt: { type: String, required: true },
      evaluationPrompt: { type: String, required: true },
    },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    endedEarlyAt: { type: Date, default: null },
  },
  { timestamps: true },
);

interviewSessionSchema.index({ userId: 1, createdAt: -1 });
interviewSessionSchema.index({ userId: 1, roleId: 1, status: 1 });

export const InterviewSession =
  mongoose.models.InterviewSession ??
  mongoose.model('InterviewSession', interviewSessionSchema);
