import mongoose from 'mongoose';
export async function connectDatabase(uri = process.env.MONGO_URI) {
  if (!uri)
    throw new Error(
      'Set MONGO_URI in server/.env before starting. Use npm run demo for a temporary local MongoDB demo.',
    );
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('MongoDB connected');
}
