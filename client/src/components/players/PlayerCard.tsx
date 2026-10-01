import { Link } from 'react-router-dom';
import type { Player } from '../../types';
import { Avatar, Badge } from '../ui';
import { capitalize } from '../../utils/format';
export function PlayerCard({ player }: { player: Player }) {
  return (
    <article className="card player-card">
      <div className="player-card-top">
        <Avatar name={player.name} id={player._id} large />
        <div>
          <h3>{player.name}</h3>
          <Badge tone={`skill-${player.skillLevel}`}>{capitalize(player.skillLevel)}</Badge>
          <p className="muted">
            {capitalize(player.preferredPlay)}
            {!player.isActive && ' · Inactive'}
          </p>
        </div>
      </div>
      <div className="player-metrics">
        <div>
          <strong>{player.wins}</strong>
          <span>Wins</span>
        </div>
        <div>
          <strong>{player.losses}</strong>
          <span>Losses</span>
        </div>
        <div>
          <strong>{player.winRate}%</strong>
          <span>Win rate</span>
        </div>
      </div>
      <Link className="button button-secondary" to={`/players/${player._id}`}>
        View Profile
      </Link>
    </article>
  );
}
