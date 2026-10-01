import type { RequestHandler } from 'express';
import { Reservation } from '../models/Reservation.js';
import { assert } from '../utils/errors.js';
import { validateId, dateSchema, parse } from '../utils/validation.js';
import { saveReservation } from '../services/reservationService.js';
import { courtTransaction } from '../services/courtLock.js';
export const list: RequestHandler = async (req, res) => {
  const filter: Record<string, unknown> = {};
  if (req.query.courtId) filter.courtId = validateId(String(req.query.courtId));
  if (req.query.playerId) filter.playerId = validateId(String(req.query.playerId));
  if (req.query.status) filter.status = String(req.query.status);
  if (req.query.date) filter.reservationDate = parse(dateSchema, req.query.date);
  const rows = await Reservation.find(filter)
    .populate(['playerId', 'courtId'])
    .sort({ reservationDate: -1, startTime: 1 })
    .lean();
  const search = String(req.query.search || '').toLowerCase();
  res.json(
    rows.filter(
      (row) =>
        !search || JSON.stringify([row.playerId, row.courtId]).toLowerCase().includes(search),
    ),
  );
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
  res.json(await saveReservation(req.body, String(req.params.id)));
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
