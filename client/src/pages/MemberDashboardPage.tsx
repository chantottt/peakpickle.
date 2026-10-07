import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { ActivityPage } from './ActivityPage';
import { useApi } from '../hooks/useApi';
import type { Player, Match } from '../types';
import { MatchCard } from '../components/matches/MatchCard';
import { DataState, EmptyState } from '../components/ui';
export function MemberDashboardPage() {
  const { account } = useAuth();
  const profile = useApi<Player>(account?.playerId ? `/players/${account.playerId}` : null);
  const matches = useApi<Match[]>('/matches?status=completed&page=1&pageSize=5');
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
      <DataState {...profile} hasData={!!profile.data} onRetry={profile.refetch}>
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
      </DataState>
      <ActivityPage />
      <h2>Recent matches</h2>
      <DataState {...matches} hasData={!!matches.data} onRetry={matches.refetch}>
        {matches.data?.map((match) => (
          <MatchCard key={match._id} match={match} />
        ))}
        {matches.data?.length === 0 && (
          <EmptyState
            title="No completed matches yet"
            description="Your results will appear here after your first match."
          />
        )}
      </DataState>
    </>
  );
}
