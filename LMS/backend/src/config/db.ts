import mongoose from 'mongoose';
import { env } from './env';

export async function connectDb(uri = env.mongoUri): Promise<void> {
  await mongoose.connect(uri);
  console.log('MongoDB connected');
}
