import { QueueEntry } from '../models/QueueEntry.js';
import { Player } from '../models/Player.js';
import { Court } from '../models/Court.js';
import { Match } from '../models/Match.js';
import { assert } from '../utils/errors.js';
import { parse, queueSchema, validateId } from '../utils/validation.js';
import { courtTransaction } from './courtLock.js';
import { transition } from './transitions.js';
import { lockActivePlayers } from './playerLock.js';
export async function averageDuration(courtId?: string) {
  const rows = await Match.find({
    status: 'completed',
    startedAt: { $ne: null },
    completedAt: { $ne: null },
    ...(courtId ? { courtId } : {}),
  }).lean();
  const durations = rows
    .map(
      (match) =>
        (new Date(match.completedAt!).getTime() - new Date(match.startedAt!).getTime()) / 60000,
    )
    .filter((minutes) => minutes > 0);
  return durations.length
    ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
    : 15;
}
export async function queueSummary(courtId?: string) {
  if (courtId) validateId(courtId);
  const courts = await Court.find(courtId ? { _id: courtId } : {})
    .sort({ courtNumber: 1 })
    .lean();
  if (courtId) assert(courts.length, 'Record not found', 404);
  return Promise.all(
    courts.map(async (court) => {
      const entries = await QueueEntry.find({
        courtId: court._id,
        status: { $in: ['waiting', 'called', 'playing'] },
      })
        .populate('playerId')
        .sort({ joinedAt: 1, _id: 1 })
        .lean();
      const averageMatchDuration = await averageDuration(String(court._id));
      const currentMatch = await Match.findOne({ courtId: court._id, status: 'ongoing' })
        .populate('players')
        .lean();
      const active = entries.map((entry, index) => ({
        ...entry,
        position: index + 1,
        playersAhead: index,
        estimatedWait: index * averageMatchDuration,
      }));
      const waiting = active.filter((entry) => entry.status !== 'playing');
      return {
        court,
        entries: active,
        waitingCount: waiting.length,
        averageMatchDuration,
        estimatedFinish: currentMatch?.startedAt
          ? new Date(new Date(currentMatch.startedAt).getTime() + averageMatchDuration * 60000)
          : null,
        currentMatch,
      };
    }),
  );
}
export async function joinQueue(body: unknown) {
  const input = parse(queueSchema, body);
  return courtTransaction([input.courtId], async (session) => {
    await lockActivePlayers([input.playerId], session);
    const court = await Court.findById(input.courtId).session(session);
    assert(court && court.status !== 'maintenance', 'Court is under maintenance.');
    assert(
      !(await QueueEntry.exists({
        playerId: input.playerId,
        status: { $in: ['waiting', 'called', 'playing'] },
      }).session(session)),
      'Player already belongs to an active queue.',
    );
    assert(
      !(await Match.exists({ players: input.playerId, status: 'ongoing' }).session(session)),
      'Player is already playing.',
    );
    const entry = new QueueEntry(input);
    await entry.save({ session });
    return entry.populate('playerId');
  });
}
export async function callNext(courtId: string) {
  validateId(courtId);
  return courtTransaction([courtId], async (session) => {
    const court = await Court.findById(courtId).session(session);
    assert(court && court.status !== 'maintenance', 'Court is under maintenance.');
    assert(
      !(await QueueEntry.exists({ courtId, status: 'called' }).session(session)),
      'Start or skip the called players first.',
    );
    const entries = await QueueEntry.find({ courtId, status: 'waiting' })
      .sort({ joinedAt: 1, _id: 1 })
      .limit(2)
      .session(session);
    assert(entries.length === 2, 'At least two waiting players are needed for singles.');
    for (const entry of entries) {
      entry.status = 'called';
      entry.calledAt = new Date();
      await entry.save({ session });
    }
    return entries;
  });
}
export async function startQueuedMatch(courtId: string) {
  validateId(courtId);
  return courtTransaction([courtId], async (session) => {
    const court = await Court.findById(courtId).session(session);
    assert(court && court.status === 'available', 'Court must be available to start a match.');
    assert(
      !(await Match.exists({ courtId, status: 'ongoing' }).session(session)),
      'A match is already playing.',
    );
    const entries = await QueueEntry.find({ courtId, status: 'called' })
      .sort({ joinedAt: 1, _id: 1 })
      .limit(2)
      .session(session);
    assert(entries.length === 2, 'Call the next two players first.');
    const players = entries.map((entry) => entry.playerId);
    await lockActivePlayers(players.map(String), session);
    assert(
      !(await Match.exists({ players: { $in: players }, status: 'ongoing' }).session(session)),
      'A called player is already playing.',
    );
    const activePlayers = await Player.countDocuments({
      _id: { $in: players },
      isActive: true,
    }).session(session);
    assert(activePlayers === 2, 'Called players must be active.');
    const now = new Date();
    const match = new Match({
      courtId,
      players,
      playType: 'singles',
      status: 'ongoing',
      scheduledAt: now,
      startedAt: now,
      queueEntryIds: entries.map((entry) => entry._id),
    });
    await match.save({ session });
    for (const entry of entries) {
      entry.status = 'playing';
      entry.startedAt = now;
      await entry.save({ session });
    }
    court.status = 'occupied';
    await court.save({ session });
    return match.populate(['courtId', 'players']);
  });
}
export async function changeQueueEntry(
  id: string,
  status: 'called' | 'playing' | 'completed' | 'cancelled' | 'skipped',
) {
  validateId(id);
  const old = await QueueEntry.findById(id);
  assert(old, 'Record not found', 404);
  transition('queue', old.status, status);
  if (status === 'playing') return startQueuedMatch(String(old.courtId));
  assert(status !== 'completed', 'Record the match result to complete playing queue entries.');
  return courtTransaction([String(old.courtId)], async (session) => {
    const entry = await QueueEntry.findById(id).session(session);
    assert(entry, 'Record not found', 404);
    transition('queue', entry.status, status);
    if (status === 'called') {
      const first = await QueueEntry.findOne({ courtId: entry.courtId, status: 'waiting' })
        .sort({ joinedAt: 1, _id: 1 })
        .session(session);
      assert(String(first?._id) === id, 'Call players in first-come-first-served order.');
      assert(
        (await QueueEntry.countDocuments({ courtId: entry.courtId, status: 'called' }).session(
          session,
        )) < 2,
        'Two players are already called.',
      );
      entry.calledAt = new Date();
    }
    entry.status = status;
    await entry.save({ session });
    return entry.populate('playerId');
  });
}
