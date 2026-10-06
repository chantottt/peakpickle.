import { currentTime } from '../utils/time.js';
import { Match } from '../models/Match.js';
import { MatchResult } from '../models/MatchResult.js';
import { Player } from '../models/Player.js';
import { Court } from '../models/Court.js';
import { QueueEntry } from '../models/QueueEntry.js';
import { assert } from '../utils/errors.js';
import { parse, matchSchema, resultSchema, validateId } from '../utils/validation.js';
import { transition } from './transitions.js';
import { courtTransaction } from './courtLock.js';
import { lockActivePlayers } from './playerLock.js';
import { checkMatchStart } from './availabilityService.js';
export async function saveMatch(body: unknown, id?: string) {
  if (id) validateId(id);
  const input = id ? parse(matchSchema.partial(), body) : parse(matchSchema, body);
  const old = id ? await Match.findById(id) : null;
  if (id) assert(old, 'Record not found', 404);
  const courtId = input.courtId || String(old?.courtId);
  return courtTransaction([courtId, ...(old ? [String(old.courtId)] : [])], async (session) => {
    const match = id ? await Match.findById(id).session(session) : new Match(input);
    assert(match, 'Record not found', 404);
    const oldStatus = match.status;
    if (id) {
      assert(
        oldStatus === 'scheduled' || Object.keys(input).every((key) => key === 'status'),
        'Only scheduled matches can be edited.',
      );
      if (input.status) transition('match', oldStatus, input.status);
      assert(input.status !== 'completed', 'Record a match result to complete this match.');
      if (input.status === 'cancelled') {
        assert(
          Object.keys(input).every((key) => key === 'status'),
          'Cancel a match separately from editing its details.',
        );
        match.status = 'cancelled';
        await match.save({ session });
        return match.populate(['courtId', 'players']);
      }
      match.set(input);
    } else assert(match.status === 'scheduled', 'New matches must be scheduled.');
    await lockActivePlayers(match.players.map(String), session);
    const playerCount = await Player.countDocuments({
      _id: { $in: match.players },
      isActive: true,
    }).session(session);
    assert(playerCount === match.players.length, 'Select distinct active players.');
    const court = await Court.findById(match.courtId).session(session);
    assert(court && court.status !== 'maintenance', 'Court is under maintenance.');
    if (match.status === 'ongoing' && oldStatus !== 'ongoing') {
      assert(court.status === 'available', 'Court is currently occupied.');
      assert(
        !(await Match.exists({
          courtId: match.courtId,
          status: 'ongoing',
          _id: { $ne: match._id },
        }).session(session)),
        'A match is already playing on this court.',
      );
      assert(
        !(await Match.exists({
          players: { $in: match.players },
          status: 'ongoing',
          _id: { $ne: match._id },
        }).session(session)),
        'A selected player is already playing.',
      );
      match.startedAt = currentTime();
      await checkMatchStart(
        String(match.courtId),
        match.players.map(String),
        match.startedAt,
        session,
      );
      court.status = 'occupied';
      await court.save({ session });
    }
    await match.save({ session });
    return match.populate(['courtId', 'players']);
  });
}
export async function recordResult(body: unknown) {
  const input = parse(resultSchema, body);
  const old = await Match.findById(input.matchId);
  assert(old, 'Record not found', 404);
  return courtTransaction([String(old.courtId)], async (session) => {
    const match = await Match.findById(input.matchId).session(session);
    assert(match, 'Record not found', 404);
    transition('match', match.status, 'completed');
    assert(match.status === 'ongoing', 'Only an ongoing match can have a result.');
    assert(
      !(await MatchResult.exists({ matchId: match._id }).session(session)),
      'This match already has a result.',
    );
    const half = match.players.length / 2;
    const winners =
      input.teamOneScore > input.teamTwoScore
        ? match.players.slice(0, half)
        : match.players.slice(half);
    if (input.winnerPlayerIds)
      assert(
        [...input.winnerPlayerIds].sort().join() === winners.map(String).sort().join(),
        'Winner IDs must match the winning team.',
      );
    const result = new MatchResult({ ...input, winnerPlayerIds: winners });
    await result.save({ session });
    match.status = 'completed';
    match.completedAt = currentTime();
    await match.save({ session });
    await Court.updateOne({ _id: match.courtId }, { status: 'available' }, { session });
    await QueueEntry.updateMany(
      { _id: { $in: match.queueEntryIds }, status: 'playing' },
      { status: 'completed', completedAt: match.completedAt },
      { session },
    );
    return result;
  });
}
export async function matchesWithResults(filter: object = {}) {
  const matches = await Match.find(filter)
    .populate(['courtId', 'players'])
    .sort({ scheduledAt: -1 })
    .lean();
  const results = await MatchResult.find({
    matchId: { $in: matches.map((match) => match._id) },
  }).lean();
  const byMatch = new Map(results.map((result) => [String(result.matchId), result]));
  return matches.map((match) => ({ ...match, result: byMatch.get(String(match._id)) || null }));
}
