import type { RequestHandler } from 'express';
import { Match } from '../models/Match.js';
import { MatchResult } from '../models/MatchResult.js';
import { assert } from '../utils/errors.js';
import { validateId } from '../utils/validation.js';
import { matchesWithResults, saveMatch, recordResult } from '../services/matchService.js';
import { courtTransaction } from '../services/courtLock.js';
export const list: RequestHandler = async (req, res) => {
  const filter = {
    ...(req.query.status ? { status: String(req.query.status) } : {}),
    ...(req.query.playType ? { playType: String(req.query.playType) } : {}),
    ...(req.query.courtId ? { courtId: validateId(String(req.query.courtId)) } : {}),
  };
  const search = String(req.query.search || '').toLowerCase();
  res.json(
    (await matchesWithResults(filter)).filter(
      (match) =>
        !search || JSON.stringify([match.courtId, match.players]).toLowerCase().includes(search),
    ),
  );
};
export const detail: RequestHandler = async (req, res) => {
  const match = (await matchesWithResults({ _id: validateId(String(req.params.id)) }))[0];
  assert(match, 'Record not found', 404);
  res.json(match);
};
export const create: RequestHandler = async (req, res) =>
  res.status(201).json(await saveMatch(req.body));
export const update: RequestHandler = async (req, res) =>
  res.json(await saveMatch(req.body, String(req.params.id)));
export const remove: RequestHandler = async (req, res) => {
  const id = validateId(String(req.params.id));
  const old = await Match.findById(id);
  assert(old, 'Record not found', 404);
  await courtTransaction([String(old.courtId)], async (session) => {
    const match = await Match.findById(id).session(session);
    assert(match, 'Record not found', 404);
    assert(match.status !== 'ongoing', 'Complete an ongoing match before deleting it.');
    await MatchResult.deleteOne({ matchId: id }, { session });
    await match.deleteOne({ session });
  });
  res.json({ message: 'Match deleted successfully.' });
};
export const createResult: RequestHandler = async (req, res) =>
  res.status(201).json(await recordResult(req.body));
export const resultDetail: RequestHandler = async (req, res) => {
  const result = await MatchResult.findById(validateId(String(req.params.id))).populate(
    'winnerPlayerIds',
  );
  assert(result, 'Record not found', 404);
  res.json(result);
};
