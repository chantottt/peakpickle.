import { Player } from '../models/Player.js';
import { Court } from '../models/Court.js';
import { Reservation } from '../models/Reservation.js';
import { QueueEntry } from '../models/QueueEntry.js';
import { Match } from '../models/Match.js';
import { averageDuration } from './queueService.js';
import { localDate, localHour, today, toMinutes } from '../utils/time.js';
import { matchesWithResults } from './matchService.js';
export async function statistics() {
  const [courts, matches, players, queue, averageMatchDuration] = await Promise.all([
    Court.find().lean(),
    Match.find().lean(),
    Player.countDocuments({ isActive: true }),
    QueueEntry.countDocuments({ status: { $in: ['waiting', 'called'] } }),
    averageDuration(),
  ]);
  const completed = matches.filter((match) => match.status === 'completed');
  const courtUsage = courts
    .map((court) => {
      const courtMatches = completed.filter((match) => String(match.courtId) === String(court._id));
      const usedMinutes = courtMatches.reduce(
        (sum, match) =>
          sum +
          (match.startedAt && match.completedAt
            ? Math.max(0, (match.completedAt.getTime() - match.startedAt.getTime()) / 60000)
            : 0),
        0,
      );
      const operatingMinutes = toMinutes(court.closingTime) - toMinutes(court.openingTime);
      return {
        _id: String(court._id),
        name: court.name,
        matches: courtMatches.length,
        usedMinutes: Math.round(usedMinutes),
        operatingMinutes,
      };
    })
    .sort((a, b) => b.matches - a.matches);
  const peakHours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: `${String(hour).padStart(2, '0')}:00`,
    matches: completed.filter((match) => localHour(match.startedAt || match.scheduledAt) === hour)
      .length,
  }));
  const peak = [...peakHours].sort((a, b) => b.matches - a.matches)[0];
  const matchesByDay = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today() + 'T12:00:00Z');
    day.setUTCDate(day.getUTCDate() - (6 - index));
    const date = day.toISOString().slice(0, 10);
    return {
      date,
      label: new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'UTC' }).format(day),
      matches: completed.filter(
        (match) => localDate(match.completedAt || match.scheduledAt) === date,
      ).length,
    };
  });
  return {
    totalPlayers: players,
    courtsOpen: courts.filter((court) => court.status !== 'maintenance').length,
    courtsAvailable: courts.filter((court) => court.status === 'available').length,
    matchesToday: matches.filter((match) => localDate(match.scheduledAt) === today()).length,
    playersInQueue: queue,
    totalMatches: completed.length,
    averageMatchDuration,
    mostUsedCourt: courtUsage[0]?.matches ? courtUsage[0].name : 'No matches yet',
    peakPlayingHour: peak?.matches ? peak.label : 'No matches yet',
    courtUsage,
    matchesByDay,
    peakHours,
  };
}
export async function dashboard() {
  const [summary, courts, recentMatches, upcomingReservations] = await Promise.all([
    statistics(),
    Court.find().sort({ courtNumber: 1 }).lean(),
    matchesWithResults({ status: 'completed' }),
    Reservation.find({
      status: { $in: ['pending', 'confirmed'] },
      reservationDate: { $gte: today() },
    })
      .populate(['courtId', 'playerId'])
      .sort({ reservationDate: 1, startTime: 1 })
      .limit(5)
      .lean(),
  ]);
  return { ...summary, courts, recentMatches: recentMatches.slice(0, 5), upcomingReservations };
}
