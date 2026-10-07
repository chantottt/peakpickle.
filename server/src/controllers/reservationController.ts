import type { RequestHandler } from 'express';
import { Reservation } from '../models/Reservation.js';
import { assert } from '../utils/errors.js';
import { validateId, dateSchema, parse, pagination } from '../utils/validation.js';
import { saveReservation } from '../services/reservationService.js';
import { courtTransaction } from '../services/courtLock.js';
import { searchPlayerAndCourtIds } from '../services/searchService.js';
export const list: RequestHandler = async (req, res) => {
  const filter: Record<string, unknown> = {};
  if (req.query.courtId) filter.courtId = validateId(String(req.query.courtId));
  if (req.query.playerId) filter.playerId = validateId(String(req.query.playerId));
  if (req.account?.role === 'member') filter.playerId = req.account.playerId;
  if (req.query.status) filter.status = String(req.query.status);
  if (req.query.date) filter.reservationDate = parse(dateSchema, req.query.date);
  const search = await searchPlayerAndCourtIds(String(req.query.search || ''));
  if (search)
    filter.$or = [{ playerId: { $in: search.players } }, { courtId: { $in: search.courts } }];
  const window = pagination(req.query.page, req.query.pageSize);
  const query = Reservation.find(filter)
    .populate(['playerId', 'courtId'])
    .sort({ reservationDate: -1, startTime: 1, _id: -1 });
  if (window) query.skip(window.skip).limit(window.limit);
  const rows = await query.lean();
  if (window) res.set('X-Has-Next', String(rows.length > window.pageSize));
  res.json(window ? rows.slice(0, window.pageSize) : rows);
};
export const detail: RequestHandler = async (req, res) => {
  const row = await Reservation.findById(validateId(String(req.params.id))).populate([
    'playerId',
    'courtId',
  ]);
  assert(row, 'Record not found', 404);
  res.json(row);
};
export const create: RequestHandler = async (req, res) =>
  res.status(201).json(await saveReservation(req.body));
export const update: RequestHandler = async (req, res) =>
  res.json(
    await saveReservation(
      req.body,
      String(req.params.id),
      req.account?.role === 'member' ? req.account.playerId : undefined,
    ),
  );
export const remove: RequestHandler = async (req, res) => {
  const id = validateId(String(req.params.id));
  const row = await Reservation.findById(id);
  assert(row, 'Record not found', 404);
  await courtTransaction([String(row.courtId)], async (session) => {
    const result = await Reservation.deleteOne({ _id: id }, { session });
    assert(result.deletedCount, 'Record not found', 404);
  });
  res.json({ message: 'Reservation deleted successfully.' });
};
