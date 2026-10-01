import type { ClientSession } from 'mongoose';
import { Court } from '../models/Court.js';
import { Reservation } from '../models/Reservation.js';
import { assert } from '../utils/errors.js';
import { parse, availabilitySchema } from '../utils/validation.js';
export async function checkReservation(
  data: { courtId: string; reservationDate: string; startTime: string; endTime: string },
  excludeId?: string,
  session?: ClientSession,
) {
  assert(data.startTime < data.endTime, 'Start time must be before end time.');
  const court = await Court.findById(data.courtId).session(session || null);
  assert(court, 'Record not found', 404);
  assert(court.status !== 'maintenance', 'Court is under maintenance.');
  assert(
    data.startTime >= court.openingTime && data.endTime <= court.closingTime,
    'Selected time is outside court operating hours.',
  );
  const conflict = await Reservation.exists({
    courtId: data.courtId,
    reservationDate: data.reservationDate,
    status: { $in: ['pending', 'confirmed'] },
    startTime: { $lt: data.endTime },
    endTime: { $gt: data.startTime },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).session(session || null);
  assert(!conflict, 'Court is already reserved during the selected time.');
}
export async function availability(query: unknown) {
  const { date, startTime, endTime, excludeReservationId } = parse(availabilitySchema, query);
  assert(startTime < endTime, 'Start time must be before end time.');
  const reservations = await Reservation.find({
    reservationDate: date,
    status: { $in: ['pending', 'confirmed'] },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
    ...(excludeReservationId ? { _id: { $ne: excludeReservationId } } : {}),
  }).lean();
  const blocked = new Set(reservations.map((row) => String(row.courtId)));
  const courts = await Court.find({
    status: { $ne: 'maintenance' },
    openingTime: { $lte: startTime },
    closingTime: { $gte: endTime },
  }).lean();
  return courts.filter((court) => !blocked.has(String(court._id)));
}
