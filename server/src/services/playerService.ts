import { Player } from '../models/Player.js';
import { Match } from '../models/Match.js';
import { MatchResult } from '../models/MatchResult.js';
import { assert } from '../utils/errors.js';
export async function rankings() {
  const [players, matches, results] = await Promise.all([
    Player.find().lean(),
    Match.find({ status: 'completed' }).lean(),
    MatchResult.find().lean(),
  ]);
  const resultByMatch = new Map(results.map((result) => [String(result.matchId), result]));
  const totals = new Map(
    players.map((player) => [String(player._id), { matchesPlayed: 0, wins: 0 }]),
  );
  for (const match of matches) {
    const result = resultByMatch.get(String(match._id));
    if (!result) continue;
    const winners = new Set(result.winnerPlayerIds.map(String));
    for (const playerId of match.players) {
      const total = totals.get(String(playerId));
      if (!total) continue;
      total.matchesPlayed++;
      if (winners.has(String(playerId))) total.wins++;
    }
  }
  return players
    .map((player) => {
      const { matchesPlayed, wins } = totals.get(String(player._id))!;
      return {
        ...player,
        matchesPlayed,
        wins,
        losses: matchesPlayed - wins,
        winRate: matchesPlayed ? Math.round((wins / matchesPlayed) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate || a.name.localeCompare(b.name))
    .map((player, index) => ({ ...player, rank: index + 1 }));
}
export async function findPlayerMatches(query: Record<string, unknown>) {
  const skill = String(query.skillLevel || 'intermediate');
  const play = String(query.playType || 'doubles');
  const slot = String(query.availableTime || 'evening');
  assert(['beginner', 'intermediate', 'advanced'].includes(skill), 'Invalid skill level.');
  assert(['singles', 'doubles', 'both'].includes(play), 'Invalid play type.');
  assert(['morning', 'afternoon', 'evening', 'any'].includes(slot), 'Invalid availability.');
  const players = await rankings();
  return players
    .filter((player) => player.isActive && String(player._id) !== query.excludePlayerId)
    .map((player) => {
      const sameSkill = player.skillLevel === skill;
      const compatibleTime = slot === 'any' || player.availability.some((value) => value === slot);
      const samePlay = player.preferredPlay === play;
      const reasons = [
        sameSkill ? 'Same skill level' : null,
        compatibleTime ? 'Compatible availability' : null,
        samePlay ? 'Same play preference' : null,
      ].filter(Boolean);
      return {
        ...player,
        matchPercentage: (sameSkill ? 60 : 0) + (compatibleTime ? 30 : 0) + (samePlay ? 10 : 0),
        matchingReason: reasons.length
          ? reasons.join(' · ')
          : 'Try a different skill or time preference',
      };
    })
    .sort((a, b) => b.matchPercentage - a.matchPercentage || b.wins - a.wins);
}
