import { randomBytes } from 'node:crypto';
import { demoAccounts } from './accounts.js';
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
process.env.JWT_SECRET = randomBytes(48).toString('hex');
await connectDatabase(database.getUri('peakpickle_demo'));
console.log(await seedData());
await demoAccounts();
const demoPort = Number(process.env.DEMO_PORT || 5000);
const server = app.listen(demoPort, () =>
  console.log(
    `Temporary MongoDB demo API at http://127.0.0.1:${demoPort}/api. Data resets when stopped. Atlas mode: npm run dev:server.`,
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
