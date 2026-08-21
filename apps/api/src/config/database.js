import mongoose from 'mongoose';

export const connectDatabase = async (mongodbUri) => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(mongodbUri, { serverSelectionTimeoutMS: 5_000 });
  return mongoose.connection;
};

export const disconnectDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};
