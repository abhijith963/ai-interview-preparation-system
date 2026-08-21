import mongoose from 'mongoose';

const componentSchema = new mongoose.Schema(
  {
    available: { type: Boolean, required: true },
    effectiveWeight: { type: Number, min: 0, max: 1, required: true },
    evidenceCount: { type: Number, min: 0, required: true },
    score: { type: Number, min: 0, max: 100, default: null },
    weight: { type: Number, min: 0, max: 1, required: true },
  },
  { _id: false },
);

const readinessSnapshotSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewSession',
      required: true,
      unique: true,
    },
    roleId: { type: String, required: true },
    roleProfileVersion: { type: String, required: true },
    score: { type: Number, min: 0, max: 100, required: true },
    components: {
      improvementTrend: { type: componentSchema, required: true },
      recentPerformance: { type: componentSchema, required: true },
      resumeConsistency: { type: componentSchema, required: true },
      roleSkillCompetency: { type: componentSchema, required: true },
    },
    evidenceLevel: {
      type: String,
      enum: ['PRELIMINARY', 'MODERATE', 'STRONGER'],
      required: true,
    },
    evidenceLevelLabel: { type: String, required: true },
    missingEvidence: { type: [String], default: [] },
    explanation: { type: String, required: true },
    skillCoverage: { type: Number, min: 0, max: 1, required: true },
    sessionCount: { type: Number, min: 0, required: true },
    resumeAvailable: { type: Boolean, required: true },
    calculationVersion: { type: String, required: true },
    competencyVersion: { type: String, required: true },
    sourceCompletedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

readinessSnapshotSchema.index({ userId: 1, roleId: 1, sourceCompletedAt: -1 });

export const ReadinessSnapshot =
  mongoose.models.ReadinessSnapshot ??
  mongoose.model('ReadinessSnapshot', readinessSnapshotSchema);
