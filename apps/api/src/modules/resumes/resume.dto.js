export const toResumeDto = (resume) => ({
  id: resume._id.toString(),
  originalName: resume.originalName,
  mimeType: resume.mimeType,
  sizeBytes: resume.sizeBytes,
  status: resume.status,
  profile: resume.profile,
  warnings: resume.warnings,
  parserVersion: resume.parserVersion,
  confirmedAt: resume.confirmedAt,
  createdAt: resume.createdAt,
  updatedAt: resume.updatedAt,
});
