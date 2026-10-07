import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { ActivityPage } from './ActivityPage';
import { useApi } from '../hooks/useApi';
import type { Player, Match } from '../types';
import { MatchCard } from '../components/matches/MatchCard';
export function MemberDashboardPage() {
  const { account } = useAuth();
  const profile = useApi<Player>(account?.playerId ? `/players/${account.playerId}` : null);
  const matches = useApi<Match[]>('/matches');
  if (account?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return (
    <>
      <h1>Welcome, {account?.name}</h1>
      <p>Your member dashboard</p>
      <div className="page-actions">
        <Link className="button button-primary" to="/reservations/new">
          Book a court
        </Link>
        <Link className="button button-secondary" to="/queue">
          Join queue
        </Link>
        <Link className="button button-secondary" to={`/players/${account?.playerId}`}>
          My profile & statistics
        </Link>
      </div>
      {profile.data && (
        <div className="card">
          <h2>Player statistics</h2>
          <p>
            {profile.data.skillLevel} · {profile.data.preferredPlay}
          </p>
          <p>
            Played: {profile.data.matchesPlayed} · Wins: {profile.data.wins} · Losses:{' '}
            {profile.data.losses}
          </p>
        </div>
      )}
      <ActivityPage />
      <h2>Recent matches</h2>
      {matches.error && <p role="alert">{matches.error}</p>}
      {matches.data
        ?.filter((match) => match.status === 'completed')
        .slice(0, 5)
        .map((match) => (
          <MatchCard key={match._id} match={match} />
        ))}
    </>
  );
}
