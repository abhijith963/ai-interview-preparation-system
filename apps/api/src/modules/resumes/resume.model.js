import mongoose from 'mongoose';

const resumeSectionsSchema = new mongoose.Schema(
  {
    summary: { type: String, default: '' },
    skills: { type: String, default: '' },
    education: { type: String, default: '' },
    experience: { type: String, default: '' },
    projects: { type: String, default: '' },
    certifications: { type: String, default: '' },
  },
  { _id: false },
);

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    gridFsFileId: { type: mongoose.Schema.Types.ObjectId, required: true },
    originalName: { type: String, required: true },
    mimeType: {
      type: String,
      enum: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      required: true,
    },
    sizeBytes: { type: Number, required: true, max: 5_242_880 },
    status: {
      type: String,
      enum: ['NEEDS_REVIEW', 'CONFIRMED'],
      default: 'NEEDS_REVIEW',
    },
    extractedText: { type: String, required: true, select: false },
    profile: {
      sections: { type: resumeSectionsSchema, required: true },
      detectedSkills: { type: [String], default: [] },
    },
    warnings: { type: [String], default: [] },
    parserVersion: { type: String, required: true, default: 'deterministic-v1' },
    confirmedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Resume =
  mongoose.models.Resume ?? mongoose.model('Resume', resumeSchema);
