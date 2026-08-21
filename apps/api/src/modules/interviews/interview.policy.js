import { ADAPTIVE_CONFIG, ROLE_PROFILES } from '@ai-interview/shared';

import { AppError } from '../../lib/app-error.js';
import {
  evaluationOutputSchema,
  questionOutputSchema,
} from './interview.ai-schemas.js';

const resumeQuestionPositions = new Set([1, 4, 7, 10]);
const prohibitedInferenceTerms =
  /\b(psycholog(?:y|ical)|emotion(?:al)?|personality|honest(?:y)?|dishonest|deception|body language|voice confidence|lying|liar|fraud(?:ulent)?)\b/i;
const prohibitedPersonalQuestion =
  /\b(your age|your religion|your caste|your gender|marital status|home address|phone number)\b/i;

const normalizeQuestion = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenSimilarity = (left, right) => {
  const leftTokens = new Set(normalizeQuestion(left).split(' ').filter(Boolean));
  const rightTokens = new Set(normalizeQuestion(right).split(' ').filter(Boolean));
  if (!leftTokens.size || !rightTokens.size) return 0;
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return intersection / union;
};

export const getRoleProfile = (roleId) =>
  ROLE_PROFILES.find((role) => role.id === roleId) ?? null;

export const buildConfirmedResumeClaims = (resume) => {
  if (!resume || resume.status !== 'CONFIRMED') return [];

  const claims = [];
  const permittedSections = ['projects', 'experience', 'skills', 'certifications', 'education'];
  for (const section of permittedSections) {
    const lines = (resume.profile.sections[section] ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length >= 8)
      .filter((line) => !/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(line))
      .filter((line) => !/(?:https?:\/\/|www\.)/i.test(line))
      .filter((line) => !/(?:\+?\d[\d\s()-]{8,}\d)/.test(line));

    lines.slice(0, 4).forEach((line, index) => {
      claims.push({
        claimId: `${section}-${index + 1}`,
        section,
        text: line.slice(0, 500),
      });
    });
  }

  return claims.slice(0, 12);
};

export const selectQuestionTarget = ({ interview, role }) => {
  const nextPosition = interview.items.length + 1;
  const usedClaimIds = new Set(
    interview.items.map((item) => item.resumeClaim?.claimId).filter(Boolean),
  );
  const resumeClaim = resumeQuestionPositions.has(nextPosition)
    ? interview.resumeClaims.find((claim) => !usedClaimIds.has(claim.claimId)) ?? null
    : null;
  const category = role.categories[(nextPosition - 1) % role.categories.length];
  const usage = new Map();
  for (const item of interview.items) {
    usage.set(item.primarySkillId, (usage.get(item.primarySkillId) ?? 0) + 1);
  }
  const minimumUsage = Math.min(
    ...category.skills.map((skillId) => usage.get(skillId) ?? 0),
  );
  const skillId = category.skills.find(
    (candidate) => (usage.get(candidate) ?? 0) === minimumUsage,
  );

  return {
    categoryId: category.id,
    categoryLabel: category.label,
    questionType: resumeClaim ? 'RESUME_PROJECT' : 'ROLE_DOMAIN',
    resumeClaim,
    skillId,
  };
};

const invalidOutput = (message) => {
  throw new AppError(502, 'AI_OUTPUT_INVALID', message);
};

export const validateGeneratedQuestion = ({ context, output }) => {
  const parsed = questionOutputSchema.safeParse(output);
  if (!parsed.success) invalidOutput('The question provider returned an invalid response.');
  const question = parsed.data;
  const allowedSkills = new Set(
    context.role.categories.flatMap((category) => category.skills),
  );

  if (question.difficulty !== context.difficulty) {
    invalidOutput('The generated question did not match the requested difficulty.');
  }
  if (
    question.primaryCategoryId !== context.target.categoryId ||
    question.primarySkillId !== context.target.skillId
  ) {
    invalidOutput('The generated question did not match the selected role skill.');
  }
  if (
    question.secondarySkillIds.some(
      (skillId) => !allowedSkills.has(skillId) || skillId === question.primarySkillId,
    )
  ) {
    invalidOutput('The generated question included an unsupported secondary skill.');
  }
  if (question.questionType !== context.target.questionType) {
    invalidOutput('The generated question did not match the requested question type.');
  }
  if (context.target.resumeClaim) {
    if (question.resumeClaimId !== context.target.resumeClaim.claimId) {
      invalidOutput('The resume-based question was not grounded in the supplied claim.');
    }
  } else if (question.resumeClaimId !== null) {
    invalidOutput('A role-only question referenced an unsupported resume claim.');
  }
  if (prohibitedPersonalQuestion.test(question.questionText)) {
    invalidOutput('The generated question requested unrelated personal information.');
  }
  if (
    context.previousQuestions.some(
      (previous) =>
        normalizeQuestion(previous.questionText) === normalizeQuestion(question.questionText) ||
        tokenSimilarity(previous.questionText, question.questionText) >= 0.78,
    )
  ) {
    invalidOutput('The generated question repeated a question already asked.');
  }

  return question;
};

export const validateEvaluation = ({ context, output }) => {
  const parsed = evaluationOutputSchema.safeParse(output);
  if (!parsed.success) invalidOutput('The evaluation provider returned an invalid response.');
  const evaluation = parsed.data;
  const allowedSecondarySkills = new Set(context.question.secondarySkillIds);

  if (
    evaluation.quality.answerWasBlank ||
    evaluation.quality.answerWasUnscorable
  ) {
    invalidOutput('The provider did not return a valid evaluation for the submitted answer.');
  }
  if (
    evaluation.skillEvidence.demonstratedSecondarySkillIds.some(
      (skillId) => !allowedSecondarySkills.has(skillId),
    )
  ) {
    invalidOutput('The evaluation included unsupported skill evidence.');
  }
  if (
    prohibitedInferenceTerms.test(
      [
        evaluation.dimensionEvidence.professionalCertainty,
        evaluation.resumeConsistency.explanation ?? '',
      ].join(' '),
    )
  ) {
    invalidOutput('The evaluation made a prohibited personal inference.');
  }

  const claim = context.question.resumeClaim;
  if (claim) {
    if (
      evaluation.resumeConsistency.status === 'NOT_APPLICABLE' ||
      evaluation.resumeConsistency.claimId !== claim.claimId ||
      !evaluation.resumeConsistency.explanation
    ) {
      invalidOutput('The resume consistency observation was not grounded in the question claim.');
    }
  } else if (
    evaluation.resumeConsistency.status !== 'NOT_APPLICABLE' ||
    evaluation.resumeConsistency.claimId !== null ||
    evaluation.resumeConsistency.explanation !== null
  ) {
    invalidOutput('A role-only evaluation included a resume consistency observation.');
  }

  return evaluation;
};

export const buildQuestionContext = ({ interview, role, target }) => ({
  difficulty: interview.currentDifficulty,
  difficultyDescription: ADAPTIVE_CONFIG.descriptions[interview.currentDifficulty],
  position: interview.items.length + 1,
  previousQuestions: interview.items.map(({ _id, questionText, primarySkillId }) => ({
    id: _id.toString(),
    primarySkillId,
    questionText,
  })),
  role: {
    categories: role.categories.map(({ id, label, skills }) => ({ id, label, skills })),
    domain: role.domain,
    id: role.id,
    label: role.label,
    summary: role.summary,
    version: role.version,
  },
  target,
  totalQuestions: interview.questionCount,
});
