import { Link } from 'react-router-dom';
import { CalendarDays, Grid2X2, Users, Swords, ListOrdered, ArrowUpRight } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import type { DashboardData } from '../types';
import {
  PageHeader,
  StatCard,
  Card,
  DataState,
  StatusBadge,
  Avatar,
  EmptyState,
} from '../components/ui';
import { UsageChart } from '../components/ui/Charts';
import { dateLabel, timeLabel, teamNames } from '../utils/format';
export function DashboardPage() {
  const state = useApi<DashboardData>('/statistics/dashboard');
  const data = state.data;
  return (
    <>
      <PageHeader
        eyebrow="LET’S GET PLAYING"
        title="Good morning!"
        description="Here’s today’s pickleball activity."
        action={
          <Link to="/reservations/new" className="button button-primary">
            <CalendarDays size={17} />
            New Reservation
          </Link>
        }
      />
      <DataState {...state} hasData={!!data} onRetry={state.refetch}>
        {data && (
          <>
            <div className="stats-grid">
              <StatCard
                label="Total Players"
                value={data.totalPlayers}
                note="Our growing pickleball community"
                icon={<Users size={20} />}
              />
              <StatCard
                label="Courts Open"
                value={`${data.courtsOpen} / ${data.courts.length}`}
                note={`${data.courtsAvailable} available right now`}
                icon={<Grid2X2 size={20} />}
              />
              <StatCard
                label="Matches Today"
                value={data.matchesToday}
                note="Scheduled, playing & completed"
                icon={<Swords size={20} />}
              />
              <StatCard
                label="Players in Queue"
                value={data.playersInQueue}
                note="Ready for their next game"
                icon={<ListOrdered size={20} />}
              />
            </div>
            <div className="dashboard-grid">
              <Card className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Court Usage</h2>
                    <p className="muted">Completed matches across your courts</p>
                  </div>
                  <span className="panel-period">All time</span>
                </div>
                <UsageChart data={data.courtUsage} />
              </Card>
              <Card className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Live Court Status</h2>
                    <p className="muted">Find a place to play right now</p>
                  </div>
                  <Link to="/courts" className="text-link">
                    View all <ArrowUpRight size={15} />
                  </Link>
                </div>
                <div className="live-courts">
                  {data.courts.map((court) => (
                    <Link key={court._id} className="live-court-row" to={`/courts/${court._id}`}>
                      <img src="/pickleball-courts.jpg" alt="" />
                      <div>
                        <strong>{court.name}</strong>
                        <span>
                          Court {String(court.courtNumber).padStart(2, '0')} · {court.type}
                        </span>
                      </div>
                      <StatusBadge status={court.status} />
                    </Link>
                  ))}
                </div>
                {!data.courts.length && (
                  <EmptyState
                    title="No courts yet"
                    description="Add a court to begin managing play."
                  />
                )}
              </Card>
              <Card className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Recent Matches</h2>
                    <p className="muted">The latest from the court</p>
                  </div>
                  <Link to="/matches" className="text-link">
                    View all <ArrowUpRight size={15} />
                  </Link>
                </div>
                <div className="recent-matches">
                  {data.recentMatches.map((match) => {
                    const [one, two] = teamNames(match);
                    return (
                      <Link
                        to={`/matches/${match._id}`}
                        className="recent-match-row"
                        key={match._id}
                      >
                        <span className="match-small-icon">
                          <Swords size={19} />
                        </span>
                        <div>
                          <strong>
                            {one} <span className="muted">vs</span> {two}
                          </strong>
                          <span>
                            {match.courtId.name} ·{' '}
                            {dateLabel(match.scheduledAt, { year: undefined })}
                          </span>
                        </div>
                        <BadgeScore
                          one={match.result?.teamOneScore}
                          two={match.result?.teamTwoScore}
                        />
                      </Link>
                    );
                  })}
                </div>
                {!data.recentMatches.length && (
                  <EmptyState
                    title="The first match is waiting"
                    description="Completed matches will appear here."
                  />
                )}
              </Card>
              <Card className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Upcoming Reservations</h2>
                    <p className="muted">A little look at what’s next</p>
                  </div>
                  <Link to="/reservations" className="text-link">
                    View all <ArrowUpRight size={15} />
                  </Link>
                </div>
                <div className="upcoming-list">
                  {data.upcomingReservations.map((reservation) => (
                    <Link
                      to={`/reservations/${reservation._id}/edit`}
                      className="upcoming-row"
                      key={reservation._id}
                    >
                      <Avatar name={reservation.playerId.name} id={reservation.playerId._id} />
                      <div>
                        <strong>{reservation.playerId.name}</strong>
                        <span>{reservation.courtId.name}</span>
                        <small>
                          {dateLabel(reservation.reservationDate, { year: undefined })} ·{' '}
                          {timeLabel(reservation.startTime)}
                        </small>
                      </div>
                      <StatusBadge status={reservation.status} />
                    </Link>
                  ))}
                </div>
                {!data.upcomingReservations.length && (
                  <EmptyState
                    title="Your calendar is open"
                    description="Reserve a court for the next game."
                  />
                )}
              </Card>
            </div>
          </>
        )}
      </DataState>
    </>
  );
}
function BadgeScore({ one, two }: { one?: number; two?: number }) {
  return (
    <span className="score-badge">
      {one ?? '—'} – {two ?? '—'}
    </span>
  );
}
