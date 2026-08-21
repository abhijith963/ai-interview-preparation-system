import mongoose from 'mongoose';

import { AUTH_SESSION_COLLECTION_NAME } from '../config/session.js';

export const regenerateSession = (request) =>
  new Promise((resolve, reject) => {
    request.session.regenerate((error) => {
      if (error) reject(error);
      else resolve();
    });
  });

export const saveSession = (request) =>
  new Promise((resolve, reject) => {
    request.session.save((error) => {
      if (error) reject(error);
      else resolve();
    });
  });

export const destroySession = (request) =>
  new Promise((resolve, reject) => {
    request.session.destroy((error) => {
      if (error) reject(error);
      else resolve();
    });
  });

export const deletePersistedUserSessions = async (userId) => {
  if (!mongoose.connection.db) return;
  await mongoose.connection.db
    .collection(AUTH_SESSION_COLLECTION_NAME)
    .deleteMany({ 'session.userId': userId.toString() });
};
