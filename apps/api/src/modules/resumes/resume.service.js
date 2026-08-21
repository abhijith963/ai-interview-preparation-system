import mongoose from 'mongoose';

import { AppError } from '../../lib/app-error.js';
import { Resume } from './resume.model.js';
import { detectKnownSkills, extractResume } from './resume-parser.js';

const getBucket = () => {
  if (!mongoose.connection.db) {
    throw new Error('MongoDB must be connected before using resume storage.');
  }

  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'resumes',
  });
};

const uploadFile = ({ buffer, filename, metadata }) =>
  new Promise((resolve, reject) => {
    const stream = getBucket().openUploadStream(filename, { metadata });
    stream.once('error', reject);
    stream.once('finish', () => resolve(stream.id));
    stream.end(buffer);
  });

const deleteFile = async (fileId) => {
  await getBucket().delete(fileId);
};

export const getResumeForUser = async (userId) => Resume.findOne({ userId });

export const replaceResumeForUser = async ({ file, mimeType, userId }) => {
  const parsed = await extractResume({ buffer: file.buffer, mimeType });
  const existingResume = await Resume.findOne({ userId });
  const newFileId = await uploadFile({
    buffer: file.buffer,
    filename: file.originalname,
    metadata: { mimeType, userId: userId.toString() },
  });

  let savedResume;
  try {
    savedResume = await Resume.findOneAndUpdate(
      { userId },
      {
        extractedText: parsed.extractedText,
        gridFsFileId: newFileId,
        mimeType,
        originalName: file.originalname,
        parserVersion: 'deterministic-v1',
        profile: parsed.profile,
        sizeBytes: file.size,
        status: 'NEEDS_REVIEW',
        warnings: parsed.warnings,
        confirmedAt: null,
      },
      {
        returnDocument: 'after',
        runValidators: true,
        setDefaultsOnInsert: true,
        upsert: true,
      },
    );
  } catch (error) {
    await deleteFile(newFileId).catch(() => undefined);
    throw error;
  }

  if (existingResume?.gridFsFileId) {
    await deleteFile(existingResume.gridFsFileId).catch(() => undefined);
  }

  return { created: !existingResume, resume: savedResume };
};

export const confirmResumeForUser = async ({ sections, userId }) => {
  const resume = await Resume.findOne({ userId });
  if (!resume) {
    throw new AppError(404, 'RESUME_NOT_FOUND', 'No active resume was found.');
  }

  resume.profile.sections = sections;
  resume.profile.detectedSkills = detectKnownSkills(Object.values(sections).join('\n'));
  resume.status = 'CONFIRMED';
  resume.confirmedAt = new Date();
  await resume.save();
  return resume;
};

export const deleteResumeForUser = async (userId, { allowMissing = false } = {}) => {
  const resume = await Resume.findOne({ userId });
  if (!resume) {
    if (allowMissing) return false;
    throw new AppError(404, 'RESUME_NOT_FOUND', 'No active resume was found.');
  }

  await deleteFile(resume.gridFsFileId);
  await Resume.deleteOne({ _id: resume._id });
  return true;
};
