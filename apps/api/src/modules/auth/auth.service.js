import bcrypt from 'bcryptjs';

import { AppError } from '../../lib/app-error.js';
import { User } from '../users/user.model.js';

const PASSWORD_HASH_ROUNDS = 12;

export const registerUser = async ({
  consentVersion,
  displayName,
  email,
  password,
}) => {
  const existingUser = await User.exists({ email });

  if (existingUser) {
    throw new AppError(
      409,
      'EMAIL_ALREADY_REGISTERED',
      'An account already exists for this email.',
    );
  }

  const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);

  try {
    return await User.create({
      consent: { acceptedAt: new Date(), version: consentVersion },
      displayName,
      email,
      passwordHash,
    });
  } catch (error) {
    if (error?.code === 11_000) {
      throw new AppError(
        409,
        'EMAIL_ALREADY_REGISTERED',
        'An account already exists for this email.',
      );
    }
    throw error;
  }
};

export const authenticateUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+passwordHash');
  const validPassword = user
    ? await bcrypt.compare(password, user.passwordHash)
    : false;

  if (!user || !validPassword) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  return user;
};

export const verifyUserPassword = async (userId, password) => {
  const user = await User.findById(userId).select('+passwordHash');

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid password.');
  }

  return user;
};
