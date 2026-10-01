import { Reservation } from '../models/Reservation.js';
import { Player } from '../models/Player.js';
import { assert } from '../utils/errors.js';
import { parse, reservationSchema, validateId } from '../utils/validation.js';
import { transition } from './transitions.js';
import { courtTransaction } from './courtLock.js';
import { checkReservation } from './availabilityService.js';
import { lockActivePlayers } from './playerLock.js';
export async function saveReservation(body: unknown, id?: string) {
  if (id) validateId(id);
  const input = id ? parse(reservationSchema.partial(), body) : parse(reservationSchema, body);
  const previous = id ? await Reservation.findById(id) : null;
  if (id) assert(previous, 'Record not found', 404);
  const courtId = input.courtId || String(previous?.courtId);
  return courtTransaction(
    [courtId, ...(previous ? [String(previous.courtId)] : [])],
    async (session) => {
      const record = id ? await Reservation.findById(id).session(session) : new Reservation(input);
      assert(record, 'Record not found', 404);
      if (id) {
        assert(
          !['completed', 'cancelled'].includes(record.status) ||
            Object.keys(input).every((key) => key === 'status'),
          'A finalized reservation cannot be edited.',
        );
        if (input.status) transition('reservation', record.status, input.status);
        record.set(input);
      } else
        assert(
          ['pending', 'confirmed'].includes(record.status),
          'New reservations must be pending or confirmed.',
        );
      await lockActivePlayers([String(record.playerId)], session);
      // Cancellation still checks references, but need not check a now-unavailable slot.
      if (['pending', 'confirmed'].includes(record.status))
        await checkReservation(
          {
            courtId: String(record.courtId),
            reservationDate: record.reservationDate,
            startTime: record.startTime,
            endTime: record.endTime,
          },
          id,
          session,
        );
      await record.save({ session });
      return record.populate(['playerId', 'courtId']);
    },
  );
}
