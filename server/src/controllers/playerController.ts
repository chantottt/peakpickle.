import type { RequestHandler } from 'express';
import mongoose from 'mongoose';
import { Player } from '../models/Player.js';
import { Reservation } from '../models/Reservation.js';
import { QueueEntry } from '../models/QueueEntry.js';
import { Match } from '../models/Match.js';
import { assert } from '../utils/errors.js';
import { parse, playerSchema, validateId } from '../utils/validation.js';
import { rankings, findPlayerMatches } from '../services/playerService.js';
import { matchesWithResults } from '../services/matchService.js';
export const list: RequestHandler = async (req, res) => {
  const players = await rankings();
  const search = String(req.query.search || '').toLowerCase();
  res.json(
    players.filter(
      (player) =>
        (!search || `${player.name} ${player.email}`.toLowerCase().includes(search)) &&
        (!req.query.skillLevel || player.skillLevel === req.query.skillLevel) &&
        (!req.query.preferredPlay || player.preferredPlay === req.query.preferredPlay),
    ),
  );
};
export const detail: RequestHandler = async (req, res) => {
  const id = validateId(String(req.params.id));
  const player = (await rankings()).find((player) => String(player._id) === id);
  assert(player, 'Record not found', 404);
  res.json({ ...player, recentMatches: await matchesWithResults({ players: id }) });
};
export const create: RequestHandler = async (req, res) =>
  res.status(201).json(await Player.create(parse(playerSchema, req.body)));
export const update: RequestHandler = async (req, res) => {
  const id = validateId(String(req.params.id));
  const input = parse(playerSchema.partial(), req.body);
  const player = await mongoose.connection.transaction(async (session) => {
    const record = await Player.findOneAndUpdate(
      { _id: id },
      { $inc: { __v: 1 } },
      { new: true, session },
    );
    assert(record, 'Record not found', 404);
    if (input.isActive === false) {
      const active = await QueueEntry.exists({
        playerId: id,
        status: { $in: ['waiting', 'called', 'playing'] },
      }).session(session);
      const playing = await Match.exists({ players: id, status: 'ongoing' }).session(session);
      assert(
        !active && !playing,
        'Leave the active queue and finish playing before deactivating this player.',
      );
    }
    record.set(input);
    await record.save({ session });
    return record;
  });
  res.json(player);
};
export const remove: RequestHandler = async (req, res) => {
  const id = validateId(String(req.params.id));
  await mongoose.connection.transaction(async (session) => {
    const player = await Player.findOneAndUpdate(
      { _id: id },
      { $inc: { __v: 1 } },
      { new: true, session },
    );
    assert(player, 'Record not found', 404);
    const reservation = await Reservation.exists({ playerId: id }).session(session);
    const queue = await QueueEntry.exists({ playerId: id }).session(session);
    const match = await Match.exists({ players: id }).session(session);
    assert(
      !reservation && !queue && !match,
      'This player has related records. Deactivate the player instead.',
    );
    await player.deleteOne({ session });
  });
  res.json({ message: 'Player deleted successfully.' });
};
export const matching: RequestHandler = async (req, res) =>
  res.json(await findPlayerMatches(req.query));
export const rankingList: RequestHandler = async (_req, res) => res.json(await rankings());
