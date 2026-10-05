import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, ListOrdered, Swords } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useLiveQueue } from '../hooks/useLiveQueue';
import type { Match, Player, Reservation } from '../types';
import {
  Card,
  DataState,
  EmptyState,
  Field,
  PageHeader,
  Select,
  StatCard,
  StatusBadge,
} from '../components/ui';
import { WaitIndicator } from '../components/queue/WaitIndicator';
import { MatchCard } from '../components/matches/MatchCard';
import { dateLabel, timeLabel } from '../utils/format';

export function ActivityPage() {
  const [params, setParams] = useSearchParams();
  const playerId = params.get('player') || '';
  const players = useApi<Player[]>('/players');
  const selected = players.data?.find((player) => player._id === playerId);
  const reservations = useApi<Reservation[]>(
    selected ? `/reservations?playerId=${selected._id}` : null,
  );
  const matches = useApi<Match[]>(selected ? `/matches?playerId=${selected._id}` : null);
  const queue = useLiveQueue();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);
  const bookings = (reservations.data || [])
    .filter(
      (row) =>
        ['pending', 'confirmed'].includes(row.status) &&
        new Date(`${row.reservationDate}T${row.endTime}:00+08:00`).getTime() > now,
    )
    .sort((a, b) =>
      `${a.reservationDate} ${a.startTime}`.localeCompare(`${b.reservationDate} ${b.startTime}`),
    );
  const games = (matches.data || [])
    .filter(
      (row) =>
        row.status === 'ongoing' ||
        (row.status === 'scheduled' && new Date(row.scheduledAt).getTime() >= now),
    )
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const entries = (queue.data || []).flatMap((summary) =>
    summary.entries
      .filter((entry) => entry.playerId._id === playerId)
      .map((entry) => ({ entry, court: summary.court })),
  );
  const refresh = () => {
    void players.refetch();
    void reservations.refetch();
    void matches.refetch();
    void queue.refetch();
  };
  return (
    <>
      <PageHeader
        title="My Activity"
        description="Your next booking, your place in line, and your upcoming games."
      />
      <Card className="activity-picker">
        <Field
          label="Player"
          hint="Choose a player to view their activity in this shared club workspace."
        >
          <Select
            value={playerId}
            onChange={(event) =>
              setParams(event.target.value ? { player: event.target.value } : {})
            }
          >
            <option value="">Select a player</option>
            {players.data?.map((player) => (
              <option key={player._id} value={player._id}>
                {player.name}
                {player.isActive ? '' : ' (inactive)'}
              </option>
            ))}
          </Select>
        </Field>
      </Card>
      <DataState
        loading={
          players.loading ||
          (!!selected && (reservations.loading || matches.loading || queue.loading))
        }
        error={players.error || reservations.error || matches.error || queue.error}
        hasData={
          !!players.data && (!selected || (!!reservations.data && !!matches.data && !!queue.data))
        }
        onRetry={refresh}
      >
        {!selected ? (
          <EmptyState
            title={playerId ? 'Player not found' : 'Choose your player profile'}
            description="Select a player above to see their upcoming activity."
          />
        ) : (
          <>
            <div className="stats-grid activity-stats">
              <StatCard
                label="Upcoming reservations"
                value={bookings.length}
                icon={<CalendarDays size={18} />}
              />
              <StatCard
                label="Active queue entries"
                value={entries.length}
                icon={<ListOrdered size={18} />}
              />
              <StatCard
                label="Upcoming & live matches"
                value={games.length}
                icon={<Swords size={18} />}
              />
            </div>
            <section className="activity-section" aria-label="My queue">
              <h2>My queue</h2>
              {entries.length ? (
                entries.map(({ entry, court }) => (
                  <Card key={entry._id} className="activity-row">
                    <div>
                      <h3>{court.name}</h3>
                      <StatusBadge status={entry.status} />
                      <p className="muted">
                        Position {entry.position}
                        {entry.status === 'waiting'
                          ? ` · Estimated wait: ${entry.estimatedWait} min`
                          : ''}
                      </p>
                      {entry.status !== 'playing' && <WaitIndicator joinedAt={entry.joinedAt} />}
                    </div>
                    <Link className="button button-secondary" to={`/queue?court=${court._id}`}>
                      View queue
                    </Link>
                  </Card>
                ))
              ) : (
                <Card>
                  <EmptyState
                    title="You’re not in a queue"
                    description="Join a court queue when you’re ready to play."
                    action={
                      <Link className="button button-secondary" to="/queue">
                        Find a queue
                      </Link>
                    }
                  />
                </Card>
              )}
            </section>
            <section className="activity-section" aria-label="My reservations">
              <h2>My reservations</h2>
              {bookings.length ? (
                bookings.map((row) => (
                  <Card key={row._id} className="activity-row">
                    <div>
                      <h3>{row.courtId.name}</h3>
                      <p className="muted">
                        {dateLabel(row.reservationDate)} · {timeLabel(row.startTime)} –{' '}
                        {timeLabel(row.endTime)}
                      </p>
                      <StatusBadge status={row.status} />
                    </div>
                    <div className="page-actions">
                      <Link
                        className="button button-secondary"
                        to={`/reservations/${row._id}/edit`}
                      >
                        View booking
                      </Link>
                    </div>
                  </Card>
                ))
              ) : (
                <Card>
                  <EmptyState
                    title="No upcoming reservations"
                    description="Make time for your next game."
                    action={
                      <Link
                        className="button button-primary"
                        to={`/reservations/new?player=${selected._id}`}
                      >
                        Book a court
                      </Link>
                    }
                  />
                </Card>
              )}
            </section>
            <section className="activity-section" aria-label="My matches">
              <h2>My matches</h2>
              {games.length ? (
                <div className="match-list">
                  {games.map((match) => (
                    <MatchCard key={match._id} match={match} />
                  ))}
                </div>
              ) : (
                <Card>
                  <EmptyState
                    title="No upcoming matches"
                    description="Your scheduled and ongoing matches will appear here."
                  />
                </Card>
              )}
            </section>
            <p className="table-footnote">All times are in Asia/Manila.</p>
          </>
        )}
      </DataState>
    </>
  );
}
