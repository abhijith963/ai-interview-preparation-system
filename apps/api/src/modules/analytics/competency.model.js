import mongoose from 'mongoose';

const competencySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    roleId: { type: String, required: true },
    roleProfileVersion: { type: String, required: true },
    categoryId: { type: String, required: true },
    categoryLabel: { type: String, required: true },
    skillId: { type: String, required: true },
    skillLabel: { type: String, required: true },
    score: { type: Number, min: 0, max: 100, required: true },
    evidenceCount: { type: Number, min: 0, required: true },
    sessionCount: { type: Number, min: 0, required: true },
    coveredDifficulties: { type: [String], default: [] },
    difficultyCoverage: {
      EASY: { type: Number, min: 0, default: 0 },
      MEDIUM: { type: Number, min: 0, default: 0 },
      HARD: { type: Number, min: 0, default: 0 },
    },
    evidenceConfidence: {
      type: String,
      enum: ['INSUFFICIENT', 'DEVELOPING', 'ESTABLISHED'],
      required: true,
    },
    topicStatus: {
      type: String,
      enum: ['NEEDS_MORE_EVIDENCE', 'WEAK_TOPIC', 'ON_TRACK'],
      required: true,
    },
    trend: {
      delta: { type: Number, default: null },
      direction: {
        type: String,
        enum: ['IMPROVING', 'STABLE', 'DECLINING', 'INSUFFICIENT_EVIDENCE'],
        required: true,
      },
    },
    lastEvidenceAt: { type: Date, default: null },
    calculationVersion: { type: String, required: true },
  },
  { timestamps: true },
);

competencySchema.index(
  { userId: 1, roleId: 1, skillId: 1 },
  { unique: true },
);

export const Competency =
  mongoose.models.Competency ?? mongoose.model('Competency', competencySchema);
