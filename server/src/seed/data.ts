import { Types } from 'mongoose';
import { Player } from '../models/Player.js';
import { Court } from '../models/Court.js';
import { Reservation } from '../models/Reservation.js';
import { QueueEntry } from '../models/QueueEntry.js';
import { Match } from '../models/Match.js';
import { MatchResult } from '../models/MatchResult.js';
import { today } from '../utils/time.js';
export const seedId = (value: number) => new Types.ObjectId(value.toString(16).padStart(24, '0'));
export async function seedData() {
  // Only these application's six collections are replaced, never the database itself.
  await MatchResult.deleteMany({});
  await QueueEntry.deleteMany({});
  await Match.deleteMany({});
  await Reservation.deleteMany({});
  await Court.deleteMany({});
  await Player.deleteMany({});
  const names = [
    'Miguel Santos',
    'Sofia Reyes',
    'Paolo Cruz',
    'Isabella Garcia',
    'Andrei Dela Cruz',
    'Camille Bautista',
    'Rafael Mendoza',
    'Bea Villanueva',
    'Gabriel Ramos',
    'Alyssa Tan',
    'Enzo Navarro',
    'Patricia Lim',
    'Joshua Aquino',
    'Nicole Castillo',
    'Marco Fernandez',
    'Andrea Torres',
    'Luis Santiago',
    'Mika Soriano',
    'Carlo Valdez',
    'Daniella Flores',
  ];
  await Player.insertMany(
    names.map((name, index) => ({
      _id: seedId(100 + index),
      name,
      email: name.toLowerCase().replaceAll(' ', '.') + '@peakpickle.demo',
      skillLevel: ['intermediate', 'advanced', 'beginner'][index % 3],
      preferredPlay: ['doubles', 'singles', 'both'][index % 3],
      availability: index % 2 ? ['afternoon', 'evening'] : ['morning', 'evening'],
    })),
  );
  const courtNames = [
    'Riverside Court',
    'The Greenhouse',
    'Parkside Court',
    'Summit Arena',
    'Courtyard Five',
    'Lakeside Court',
  ];
  await Court.insertMany(
    courtNames.map((name, index) => ({
      _id: seedId(200 + index),
      name,
      courtNumber: index + 1,
      location: ['BGC, Taguig', 'Makati City', 'Pasig City'][index % 3],
      type: index === 1 || index === 3 ? 'indoor' : 'outdoor',
      status: index === 1 ? 'occupied' : index === 4 ? 'maintenance' : 'available',
      openingTime: '06:00',
      closingTime: '22:00',
    })),
  );
  const day = (offset: number) => {
    const date = new Date(today() + 'T12:00:00Z');
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  };
  await Reservation.insertMany(
    Array.from({ length: 35 }, (_, index) => ({
      _id: seedId(300 + index),
      playerId: seedId(100 + (index % 20)),
      courtId: seedId(200 + [0, 1, 2, 3, 5][index % 5]),
      reservationDate: day(index < 30 ? Math.floor(index / 5) : -1 - (index - 30)),
      startTime: '17:00',
      endTime: '18:00',
      status: index >= 30 ? 'completed' : index % 3 === 0 ? 'pending' : 'confirmed',
    })),
  );
  const completedMatches = Array.from({ length: 42 }, (_, index) => {
    const doubles = index % 4 === 0;
    const first = index % 20;
    const players = Array.from({ length: doubles ? 4 : 2 }, (_, position) =>
      seedId(100 + ((first + position * 3) % 20)),
    );
    const date = day(-Math.floor(index / 3));
    const hour = index < 3 ? 7 + index : 7 + (index % 3) * 5;
    const start = new Date(`${date}T${String(hour).padStart(2, '0')}:00:00+08:00`);
    return {
      _id: seedId(400 + index),
      courtId: seedId(200 + [0, 1, 2, 3, 5][index % 5]),
      players,
      playType: doubles ? 'doubles' : 'singles',
      status: 'completed',
      scheduledAt: start,
      startedAt: start,
      completedAt: new Date(start.getTime() + (12 + (index % 9)) * 60000),
    };
  });
  await Match.insertMany(completedMatches);
  await MatchResult.insertMany(
    completedMatches.map((match, index) => ({
      _id: seedId(500 + index),
      matchId: match._id,
      teamOneScore: index % 3 === 0 ? 7 : 11,
      teamTwoScore: index % 3 === 0 ? 11 : 5 + (index % 5),
      winnerPlayerIds:
        index % 3 === 0
          ? match.players.slice(match.players.length / 2)
          : match.players.slice(0, match.players.length / 2),
    })),
  );
  const now = new Date();
  const queueRows = Array.from({ length: 14 }, (_, index) => ({
    _id: seedId(600 + index),
    playerId: seedId(100 + index),
    courtId: seedId(200 + (index < 2 || index >= 12 ? 1 : index < 8 ? 0 : 2)),
    status: index < 2 ? 'playing' : 'waiting',
    joinedAt: new Date(now.getTime() - (60 - index * 3) * 60000),
    ...(index < 2
      ? {
          calledAt: new Date(now.getTime() - 8 * 60000),
          startedAt: new Date(now.getTime() - 5 * 60000),
        }
      : {}),
  }));
  await QueueEntry.insertMany(queueRows);
  await Match.create({
    _id: seedId(450),
    courtId: seedId(201),
    players: [seedId(100), seedId(101)],
    queueEntryIds: [seedId(600), seedId(601)],
    playType: 'singles',
    status: 'ongoing',
    scheduledAt: now,
    startedAt: new Date(now.getTime() - 5 * 60000),
  });
  await Match.insertMany(
    Array.from({ length: 4 }, (_, index) => ({
      _id: seedId(460 + index),
      courtId: seedId(200 + [0, 1, 2, 3][index]),
      players: [seedId(114 + index), seedId(100 + ((index + 19) % 20))],
      playType: 'singles',
      status: 'scheduled',
      scheduledAt: new Date(`${day(index)}T18:00:00+08:00`),
    })),
  );
  // Ensure indexes exist before accepting requests (unique emails, active queues, ongoing matches).
  for (const model of [Player, Court, Reservation, QueueEntry, Match, MatchResult])
    await model.init();
  return { players: 20, courts: 6, reservations: 35, queueEntries: 14, matches: 47, results: 42 };
}
