import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { seedData } from './data.js';
dotenv.config();
if (
  process.env.MONGO_URI?.startsWith('mongodb+srv://') &&
  !process.argv.includes('--allow-atlas-reset')
) {
  console.error(
    'Atlas reset refused. An explicitly authorized Atlas demo reset requires --confirm and --allow-atlas-reset, plus --reset-users when accounts exist.',
  );
  process.exit(1);
}
if (!process.argv.includes('--confirm')) {
  console.error(
    'Seeding replaces PeakPickle demo records in the configured database. Run npm run seed -- --confirm in server/ after choosing a dedicated database.',
  );
  process.exit(1);
}
try {
  await connectDatabase();
  console.log(await seedData(process.argv.includes('--reset-users')));
} catch (error) {
  console.error('Seed failed. Check configuration; accounts require explicit --reset-users.');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
