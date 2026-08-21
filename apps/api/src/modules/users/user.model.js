import { ROLE_PROFILES } from '@ai-interview/shared';
import mongoose from 'mongoose';

const approvedRoleIds = ROLE_PROFILES.map(({ id }) => id);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    passwordHash: { type: String, required: true, select: false },
    displayName: { type: String, trim: true, maxlength: 80 },
    selectedRoleId: { type: String, enum: approvedRoleIds, default: null },
    consent: {
      version: { type: String, required: true },
      acceptedAt: { type: Date, required: true },
    },
  },
  { timestamps: true },
);

export const User = mongoose.models.User ?? mongoose.model('User', userSchema);
