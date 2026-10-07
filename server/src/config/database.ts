import mongoose from 'mongoose';
import { setServers } from 'node:dns';

setServers(['1.1.1.1', '8.8.8.8']);
export async function connectDatabase(uri = process.env.MONGO_URI) {
  if (!uri)
    throw new Error(
      'Set MONGO_URI in server/.env before starting. Use npm run demo for a temporary local MongoDB demo.',
    );
  if (!/^mongodb(\+srv)?:\/\//.test(uri))
    throw new Error('MONGO_URI must be a mongodb:// or mongodb+srv:// connection string.');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  console.log('MongoDB connected');
}
