import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { connectDatabase, disconnectDatabase } from '../../src/config/database.js';
import { Competency } from '../../src/modules/analytics/competency.model.js';
import { ReadinessSnapshot } from '../../src/modules/analytics/readiness-snapshot.model.js';
import { InterviewSession } from '../../src/modules/interviews/interview.model.js';
import { Resume } from '../../src/modules/resumes/resume.model.js';
import { User } from '../../src/modules/users/user.model.js';

let mongoServer;

export const startTestDatabase = async () => {
  mongoServer = await MongoMemoryServer.create({
    binary: { systemBinary: '/usr/bin/mongod' },
  });
  await connectDatabase(mongoServer.getUri());
  await Promise.all([
    User.init(),
    Resume.init(),
    InterviewSession.init(),
    Competency.init(),
    ReadinessSnapshot.init(),
  ]);
};

export const clearTestDatabase = async () => {
  await Promise.all([
    User.deleteMany({}),
    Resume.deleteMany({}),
    InterviewSession.deleteMany({}),
    Competency.deleteMany({}),
    ReadinessSnapshot.deleteMany({}),
    mongoose.connection.db.collection('authSessions').deleteMany({}),
    mongoose.connection.db.collection('resumes.files').deleteMany({}),
    mongoose.connection.db.collection('resumes.chunks').deleteMany({}),
  ]);
};

export const stopTestDatabase = async () => {
  await disconnectDatabase();
  await mongoServer?.stop();
};
