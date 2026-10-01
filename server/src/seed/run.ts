import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { seedData } from './data.js';
dotenv.config();
if (!process.argv.includes('--confirm')) {
  console.error(
    'Seeding replaces PeakPickle demo records in the configured database. Run npm run seed -- --confirm in server/ after choosing a dedicated database.',
  );
  process.exit(1);
}
try {
  await connectDatabase();
  console.log(await seedData());
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
