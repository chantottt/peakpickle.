import type { RequestHandler } from 'express';
import { QueueEntry } from '../models/QueueEntry.js';
import { assert } from '../utils/errors.js';
import { parse, queuePatchSchema, queueCallSchema, validateId } from '../utils/validation.js';
import {
  joinQueue,
  queueSummary,
  changeQueueEntry,
  callNext,
  startQueuedMatch,
} from '../services/queueService.js';
import { courtTransaction } from '../services/courtLock.js';
export const list: RequestHandler = async (req, res) => {
  const filter = {
    ...(req.query.courtId ? { courtId: validateId(String(req.query.courtId)) } : {}),
    ...(req.query.status ? { status: String(req.query.status) } : {}),
  };
  res.json(
    await QueueEntry.find(filter)
      .populate(['playerId', 'courtId'])
      .sort({ joinedAt: 1, _id: 1 })
      .lean(),
  );
};
export const summary: RequestHandler = async (req, res) =>
  res.json(await queueSummary(req.query.courtId ? String(req.query.courtId) : undefined));
export const create: RequestHandler = async (req, res) =>
  res.status(201).json(await joinQueue(req.body));
export const update: RequestHandler = async (req, res) => {
  const { status, playType } = parse(queuePatchSchema, req.body);
  res.json(await changeQueueEntry(String(req.params.id), status, playType));
};
export const remove: RequestHandler = async (req, res) => {
  const id = validateId(String(req.params.id));
  const old = await QueueEntry.findById(id);
  assert(old, 'Record not found', 404);
  await courtTransaction([String(old.courtId)], async (session) => {
    const entry = await QueueEntry.findById(id).session(session);
    assert(entry, 'Record not found', 404);
    assert(
      !['called', 'playing'].includes(entry.status),
      'Skip called players or complete their match before deleting.',
    );
    await entry.deleteOne({ session });
  });
  res.json({ message: 'Queue entry deleted successfully.' });
};
export const call: RequestHandler = async (req, res) => {
  const { playType } = parse(queueCallSchema, req.body || {});
  res.json(await callNext(String(req.params.courtId), playType));
};
export const start: RequestHandler = async (req, res) =>
  res.status(201).json(await startQueuedMatch(String(req.params.courtId)));
