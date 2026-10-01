import { fileURLToPath } from 'node:url';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { app } from '../app.js';
import { seedData } from './data.js';
process.env.MONGOMS_DOWNLOAD_DIR ||= fileURLToPath(
  new URL('../../../.mongodb-binaries', import.meta.url),
);
const database = await MongoMemoryReplSet.create({
  replSet: { count: 1 },
  binary: { version: '7.0.24' },
});
await connectDatabase(database.getUri('peakpickle_demo'));
console.log(await seedData());
const server = app.listen(5000, '127.0.0.1', () =>
  console.log(
    'Temporary MongoDB demo API at http://127.0.0.1:5000/api. Data resets when stopped. Atlas mode: npm run dev:server.',
  ),
);
const shutdown = async () => {
  server.close();
  await mongoose.disconnect();
  await database.stop();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
