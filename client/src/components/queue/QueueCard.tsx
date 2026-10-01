import type { QueueSummary } from '../../types';
import { Link } from 'react-router-dom';
import { Clock3, Swords } from 'lucide-react';
import { Avatar, Card, StatusBadge } from '../ui';
import { teamNames, timeLabel } from '../../utils/format';
export function QueueCard({ summary }: { summary: QueueSummary }) {
  const match = summary.currentMatch;
  const names = match ? teamNames(match) : [];
  return (
    <Card className="now-playing">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">ON THE COURT</span>
          <h2>{summary.court.name}</h2>
        </div>
        <StatusBadge status={summary.court.status} />
      </div>
      {match ? (
        <>
          <div className="queue-match">
            <div>
              <Avatar name={match.players[0].name} id={match.players[0]._id} large />
              <strong>{names[0]}</strong>
            </div>
            <span className="versus">VS</span>
            <div>
              <Avatar name={match.players.at(-1)!.name} id={match.players.at(-1)!._id} large />
              <strong>{names[1]}</strong>
            </div>
          </div>
          <div className="queue-match-footer">
            <span>
              <Clock3 size={16} />
              Estimated finish{' '}
              <strong>{summary.estimatedFinish ? timeLabel(summary.estimatedFinish) : '—'}</strong>
            </span>
            <Link to={`/matches/${match._id}`} className="text-link">
              Match details
            </Link>
          </div>
        </>
      ) : (
        <div className="court-ready">
          <Swords size={30} />
          <h3>
            {summary.court.status === 'maintenance'
              ? 'Court under maintenance'
              : 'Ready for the next match'}
          </h3>
          <p className="muted">
            {summary.court.status === 'maintenance'
              ? 'Choose another court to join the queue.'
              : 'Call the next two players and let’s play.'}
          </p>
        </div>
      )}
    </Card>
  );
}
