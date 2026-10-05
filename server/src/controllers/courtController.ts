import type { RequestHandler } from 'express';
import { Court } from '../models/Court.js';
import { Reservation } from '../models/Reservation.js';
import { QueueEntry } from '../models/QueueEntry.js';
import { Match } from '../models/Match.js';
import { assert } from '../utils/errors.js';
import { parse, courtSchema, validateId } from '../utils/validation.js';
import { today, localTime, nextFreeTime } from '../utils/time.js';
import { averageDuration } from '../services/queueService.js';
import { availability } from '../services/availabilityService.js';
import { courtTransaction } from '../services/courtLock.js';
async function courtRows(id?: string) {
  const courts = await Court.find(id ? { _id: id } : {})
    .sort({ courtNumber: 1 })
    .lean();
  const [reservations, queues] = await Promise.all([
    Reservation.find({
      reservationDate: { $gte: today() },
      status: { $in: ['pending', 'confirmed'] },
    })
      .populate('playerId')
      .sort({ reservationDate: 1, startTime: 1 })
      .lean(),
    QueueEntry.find({ status: { $in: ['waiting', 'called'] } }).lean(),
  ]);
  return Promise.all(
    courts.map(async (court) => {
      const schedule = reservations.filter(
        (row) => String(row.courtId) === String(court._id) && row.reservationDate === today(),
      );
      const nowTime = localTime(new Date());
      let fromTime = nowTime;
      if (court.status === 'occupied') {
        const current = await Match.findOne({ courtId: court._id, status: 'ongoing' }).lean();
        const duration = await averageDuration(String(court._id));
        const finish = new Date((current?.startedAt?.getTime() || Date.now()) + duration * 60000);
        fromTime = localTime(finish) > nowTime ? localTime(finish) : nowTime;
      }
      return {
        ...court,
        queueCount: queues.filter((entry) => String(entry.courtId) === String(court._id)).length,
        nextSchedule:
          reservations.find(
            (row) =>
              String(row.courtId) === String(court._id) &&
              (row.reservationDate > today() || row.endTime > nowTime),
          ) || null,
        schedule,
        nextAvailableTime:
          court.status === 'maintenance'
            ? null
            : nextFreeTime(
                court.openingTime,
                court.closingTime,
                reservations.filter((row) => String(row.courtId) === String(court._id)),
                fromTime,
              ),
      };
    }),
  );
}
export const list: RequestHandler = async (req, res) => {
  const search = String(req.query.search || '').toLowerCase();
  res.json(
    (await courtRows()).filter(
      (court) =>
        (!search || `${court.name} ${court.location}`.toLowerCase().includes(search)) &&
        (!req.query.status || court.status === req.query.status) &&
        (!req.query.type || court.type === req.query.type),
    ),
  );
};
export const detail: RequestHandler = async (req, res) => {
  const court = (await courtRows(validateId(String(req.params.id))))[0];
  assert(court, 'Record not found', 404);
  res.json(court);
};
export const available: RequestHandler = async (req, res) =>
  res.json(await availability(req.query));
export const create: RequestHandler = async (req, res) => {
  const input = parse(courtSchema, req.body);
  assert(input.status !== 'occupied', 'New courts cannot be occupied without an ongoing match.');
  res.status(201).json(await Court.create(input));
};
export const update: RequestHandler = async (req, res) => {
  const id = validateId(String(req.params.id));
  const input = parse(courtSchema.partial(), req.body);
  const result = await courtTransaction([id], async (session) => {
    const court = await Court.findById(id).session(session);
    assert(court, 'Record not found', 404);
    const ongoing = await Match.exists({ courtId: id, status: 'ongoing' }).session(session);
    if (input.status)
      assert(
        input.status === 'occupied' ? ongoing : !ongoing,
        'Court status must agree with its ongoing match.',
      );
    court.set(input);
    assert(court.openingTime < court.closingTime, 'Closing time must be after opening time.');
    const outsideHours = await Reservation.exists({
      courtId: id,
      reservationDate: { $gte: today() },
      status: { $in: ['pending', 'confirmed'] },
      $or: [{ startTime: { $lt: court.openingTime } }, { endTime: { $gt: court.closingTime } }],
    }).session(session);
    assert(!outsideHours, 'Existing reservations fall outside these operating hours.');
    if (input.status === 'maintenance')
      assert(
        !(await Reservation.exists({
          courtId: id,
          reservationDate: { $gte: today() },
          status: { $in: ['pending', 'confirmed'] },
        }).session(session)),
        'Cancel upcoming reservations before marking maintenance.',
      );
    await court.save({ session });
    return court;
  });
  res.json(result);
};
export const remove: RequestHandler = async (req, res) => {
  const id = validateId(String(req.params.id));
  await courtTransaction([id], async (session) => {
    const reservation = await Reservation.exists({ courtId: id }).session(session);
    const queue = await QueueEntry.exists({ courtId: id }).session(session);
    const match = await Match.exists({ courtId: id }).session(session);
    assert(
      !reservation && !queue && !match,
      'This court has related records. Use maintenance status instead.',
    );
    await Court.deleteOne({ _id: id }, { session });
  });
  res.json({ message: 'Court deleted successfully.' });
};
