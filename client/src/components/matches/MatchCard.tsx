import { Link } from 'react-router-dom';
import { CalendarDays, MapPin } from 'lucide-react';
import type { Match } from '../../types';
import { Avatar, Button, StatusBadge } from '../ui';
import { dateLabel, timeLabel, teamNames, capitalize } from '../../utils/format';
export function MatchCard({
  match,
  onStart,
  onResult,
  busy,
}: {
  match: Match;
  onStart?: () => void;
  onResult?: () => void;
  busy?: boolean;
}) {
  const [one, two] = teamNames(match);
  return (
    <article className="card match-card">
      <div className="match-meta">
        <strong>
          <MapPin size={15} />
          {match.courtId.name}
        </strong>
        <span>
          <CalendarDays size={15} />
          {dateLabel(match.scheduledAt)} · {timeLabel(match.scheduledAt)}
        </span>
        <span>{capitalize(match.playType)}</span>
      </div>
      <div className="match-players">
        <div className="match-team">
          <div className="avatar-group">
            {match.players.slice(0, match.players.length / 2).map((player) => (
              <Avatar key={player._id} name={player.name} id={player._id} />
            ))}
          </div>
          <strong>{one}</strong>
        </div>
        <div className="match-score">
          {match.result ? (
            <>
              <strong>{match.result.teamOneScore}</strong>
              <span>:</span>
              <strong>{match.result.teamTwoScore}</strong>
            </>
          ) : (
            <span>VS</span>
          )}
        </div>
        <div className="match-team">
          <div className="avatar-group">
            {match.players.slice(match.players.length / 2).map((player) => (
              <Avatar key={player._id} name={player.name} id={player._id} />
            ))}
          </div>
          <strong>{two}</strong>
        </div>
      </div>
      <div className="match-actions">
        <StatusBadge status={match.status} />
        <div>
          {match.status === 'scheduled' && onStart && (
            <Button busy={busy} onClick={onStart}>
              Start Match
            </Button>
          )}
          {match.status === 'ongoing' && onResult && (
            <Button onClick={onResult}>Record Result</Button>
          )}
          <Link className="button button-secondary" to={`/matches/${match._id}`}>
            View
          </Link>
        </div>
      </div>
    </article>
  );
}
