import { Player } from '../models/Player.js';
import { Court } from '../models/Court.js';

export async function searchPlayerAndCourtIds(search: string) {
  const term = search.trim().slice(0, 80);
  if (!term) return null;
  const pattern = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const [players, courts] = await Promise.all([
    Player.find({ name: pattern }).select('_id').lean(),
    Court.find({ $or: [{ name: pattern }, { location: pattern }] })
      .select('_id')
      .lean(),
  ]);
  return {
    players: players.map((player) => player._id),
    courts: courts.map((court) => court._id),
  };
}
