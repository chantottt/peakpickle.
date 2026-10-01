import mongoose, { type ClientSession } from 'mongoose';
import { Court } from '../models/Court.js';
import { assert } from '../utils/errors.js';
export async function lockCourt(id: string, session: ClientSession) {
  const court = await Court.findOneAndUpdate(
    { _id: id },
    { $inc: { scheduleVersion: 1 } },
    { new: true, session },
  );
  assert(court, 'Record not found', 404);
  return court;
}
export async function courtTransaction<T>(
  ids: string[],
  action: (session: ClientSession) => Promise<T>,
) {
  return mongoose.connection.transaction(async (session) => {
    for (const id of [...new Set(ids)].sort()) await lockCourt(id, session);
    return action(session);
  });
}
