import { DIFFICULTY_LEVELS } from '@ai-interview/shared';
import { z } from 'zod';

const conciseText = z.string().trim().min(1).max(500);
const feedbackList = z.array(conciseText).max(6);
const dimensionScore = z.number().int().min(0).max(5);

export const questionOutputSchema = z.object({
  questionText: z.string().trim().min(15).max(800),
  questionType: z.enum(['ROLE_DOMAIN', 'RESUME_PROJECT']),
  difficulty: z.enum(DIFFICULTY_LEVELS),
  primaryCategoryId: z.string().trim().min(1).max(100),
  primarySkillId: z.string().trim().min(1).max(100),
  secondarySkillIds: z.array(z.string().trim().min(1).max(100)).max(2),
  resumeClaimId: z.string().trim().min(1).max(100).nullable(),
  rubric: z.object({
    expectedConcepts: z.array(conciseText).min(1).max(8),
    acceptableAlternatives: z.array(conciseText).max(5),
    commonMistakes: z.array(conciseText).max(5),
  }),
});

export const evaluationOutputSchema = z.object({
  dimensionScores: z.object({
    technicalAccuracy: dimensionScore,
    responseRelevance: dimensionScore,
    logicalStructure: dimensionScore,
    communicationClarity: dimensionScore,
    professionalCertainty: dimensionScore,
  }),
  dimensionEvidence: z.object({
    technicalAccuracy: conciseText,
    responseRelevance: conciseText,
    logicalStructure: conciseText,
    communicationClarity: conciseText,
    professionalCertainty: conciseText,
  }),
  strengths: feedbackList,
  missingOrIncorrectPoints: feedbackList,
  improvementAdvice: feedbackList,
  skillEvidence: z.object({
    primarySkillDemonstrated: z.boolean(),
    demonstratedSecondarySkillIds: z
      .array(z.string().trim().min(1).max(100))
      .max(2),
  }),
  resumeConsistency: z.object({
    status: z.enum([
      'SUPPORTED',
      'NEEDS_CLARIFICATION',
      'INCONSISTENT',
      'NOT_APPLICABLE',
    ]),
    claimId: z.string().trim().min(1).max(100).nullable(),
    explanation: conciseText.nullable(),
  }),
  quality: z.object({
    // HTTP validation already rejects blank answers. A response accepted for scoring must
    // therefore describe the submitted answer rather than decline to evaluate it.
    answerWasBlank: z.literal(false),
    answerWasUnscorable: z.literal(false),
    uncertaintyReason: z.null(),
  }),
});
