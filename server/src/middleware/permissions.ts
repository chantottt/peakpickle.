import type { RequestHandler } from 'express';
import { Reservation } from '../models/Reservation.js';
import { QueueEntry } from '../models/QueueEntry.js';
import { Match } from '../models/Match.js';
import { assert } from '../utils/errors.js';
import { validateId } from '../utils/validation.js';
// Defense in depth for populated sports responses. Other players' contact data is private.
export function safeFields(value: unknown, ownId?: string): unknown {
  if (value && typeof value === 'object' && '_bsontype' in value) return String(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((row) => safeFields(row, ownId));
  if (value && typeof value === 'object') {
    const row = value as Record<string, unknown>;
    const publicPlayer = 'skillLevel' in row && 'preferredPlay' in row && String(row._id) !== ownId;
    const playerFields = [
      '_id',
      'name',
      'skillLevel',
      'preferredPlay',
      'availability',
      'isActive',
      'matchesPlayed',
      'wins',
      'losses',
      'winRate',
      'rank',
      'matchPercentage',
      'matchingReason',
      'recentMatches',
    ];
    return Object.fromEntries(
      Object.entries(row)
        .filter(
          ([key]) =>
            (!publicPlayer || playerFields.includes(key)) &&
            !['passwordHash', 'sessionVersion', '__v'].includes(key) &&
            (key !== 'email' || String(row._id) === ownId),
        )
        .map(([key, item]) => [key, safeFields(item, ownId)]),
    );
  }
  return value;
}
export const permissions: RequestHandler = async (req, res, next) => {
  if (req.account!.role === 'admin') {
    next();
    return;
  }
  const own = req.account!.playerId;
  assert(own, 'Member account needs a linked player profile', 403);
  const json = res.json.bind(res);
  res.json = ((value: unknown) => {
    const data = JSON.parse(JSON.stringify(value));
    const restrictCourt = (row: any) => {
      if (row && typeof row === 'object') {
        if ('schedule' in row)
          row.schedule = row.schedule.filter(
            (booking: any) => String(booking.playerId?._id || booking.playerId) === own,
          );
        if (
          row.nextSchedule &&
          String(row.nextSchedule.playerId?._id || row.nextSchedule.playerId) !== own
        )
          row.nextSchedule = null;
        if (
          row.currentMatch &&
          !row.currentMatch.players.some((player: any) => String(player._id || player) === own)
        )
          row.currentMatch = null;
        Object.values(row).forEach(restrictCourt);
      }
    };
    restrictCourt(data);
    return json(safeFields(data, own));
  }) as typeof res.json;
  const [resource, id, action] = req.path.split('/').filter(Boolean);
  const read = req.method === 'GET';
  if (!read)
    assert(
      req.body && typeof req.body === 'object' && !Array.isArray(req.body),
      'A JSON object body is required',
      400,
    );
  if (resource === 'courts') {
    assert(read, 'Court management requires admin access', 403);
    if (req.query.excludeReservationId) {
      const booking = await Reservation.findById(
        validateId(String(req.query.excludeReservationId)),
      );
      assert(
        booking && String(booking.playerId) === own,
        'Cannot exclude another member booking',
        403,
      );
    }
  } else if (resource === 'players') {
    if (id === 'rankings' || id === 'matches') assert(read, 'Admin access required', 403);
    else if (!id) {
      assert(read, 'Player management requires admin access', 403);
    } else {
      assert(
        read || (id === own && req.method === 'PATCH'),
        'You may access only your player profile',
        403,
      );
      if (!read)
        assert(
          Object.keys(req.body).every((key) =>
            ['name', 'email', 'skillLevel', 'preferredPlay', 'availability'].includes(key),
          ),
          'This profile field requires admin access',
          403,
        );
    }
  } else if (resource === 'reservations' || resource === 'queue-entries') {
    if (resource === 'queue-entries' && (action || id === 'courts'))
      assert(read, 'Queue management requires admin access', 403);
    else if (id && id !== 'summary') {
      const record =
        resource === 'reservations'
          ? await Reservation.findById(validateId(id))
          : await QueueEntry.findById(validateId(id));
      assert(record && String(record.playerId) === own, 'Record not found', 404);
      assert(req.method !== 'DELETE', 'Cancel your entry rather than deleting its history', 403);
      if (!read && resource === 'queue-entries')
        assert(
          record.status === 'waiting' &&
            req.body.status === 'cancelled' &&
            Object.keys(req.body).every((key) => key === 'status'),
          'Members may cancel only their own waiting entry',
          403,
        );
    }
    if (!read) {
      if (req.body.playerId)
        assert(req.body.playerId === own, 'You can book or queue only for yourself', 403);
      if (resource === 'reservations') {
        assert(
          !req.body.status || ['pending', 'cancelled'].includes(req.body.status),
          'Confirmation and completion require admin access',
          403,
        );
        if (req.method === 'POST') {
          assert(
            !req.body.status || req.body.status === 'pending',
            'New member bookings must be pending',
            403,
          );
          req.body.status = 'pending';
        }
        if (req.method === 'PATCH') {
          const record = await Reservation.findById(id);
          assert(record, 'Record not found', 404);
          if (record.status === 'confirmed')
            assert(
              Object.keys(req.body).every((key) => key === 'status') &&
                req.body.status === 'cancelled',
              'Confirmed bookings can only be cancelled by members',
              403,
            );
        }
      }
      if (req.method === 'POST') req.body.playerId = own;
    }
  } else if (resource === 'matches') {
    assert(read, 'Match management requires admin access', 403);
    if (id) {
      const match = await Match.findById(validateId(id));
      assert(
        match && match.players.some((player) => String(player) === own),
        'Record not found',
        404,
      );
    }
  } else assert(false, 'Admin access required', 403);
  next();
};
