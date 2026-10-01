import { Activity, Clock3, Grid2X2, Swords } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import type { Analytics } from '../types';
import { Card, DataState, EmptyState, PageHeader, StatCard } from '../components/ui';
import { DailyChart, UsageChart, HourChart } from '../components/ui/Charts';
import { timeLabel } from '../utils/format';
export function StatisticsPage() {
  const state = useApi<Analytics>('/statistics');
  const data = state.data;
  return (
    <>
      <PageHeader
        title="Statistics"
        description="See the rhythm of your club, from first serve to final point."
      />
      <DataState {...state} hasData={!!data} onRetry={state.refetch}>
        {data && (
          <>
            <div className="stats-grid">
              <StatCard
                label="Total Matches"
                value={data.totalMatches}
                note="Completed with a recorded result"
                icon={<Swords size={20} />}
              />
              <StatCard
                label="Average Duration"
                value={`${data.averageMatchDuration} min`}
                note="From completed match times"
                icon={<Clock3 size={20} />}
              />
              <StatCard
                label="Most Used Court"
                value={<span style={{ fontSize: 20 }}>{data.mostUsedCourt}</span>}
                note="Highest completed match count"
                icon={<Grid2X2 size={20} />}
              />
              <StatCard
                label="Peak Playing Hour"
                value={
                  <span style={{ fontSize: 25 }}>
                    {data.peakPlayingHour === 'No matches yet'
                      ? '—'
                      : timeLabel(data.peakPlayingHour)}
                  </span>
                }
                note="Most common start time · Manila"
                icon={<Activity size={20} />}
              />
            </div>
            {data.totalMatches ? (
              <div className="analytics-grid">
                <Card className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Matches by Day</h2>
                      <p className="muted">Completed matches over the last 7 days</p>
                    </div>
                    <span className="panel-period">Last 7 days</span>
                  </div>
                  <DailyChart data={data.matchesByDay} />
                </Card>
                <Card className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Court Usage</h2>
                      <p className="muted">Completed matches by court</p>
                    </div>
                    <span className="panel-period">All time</span>
                  </div>
                  <UsageChart data={data.courtUsage} />
                </Card>
                <Card className="panel analytics-wide">
                  <div className="panel-heading">
                    <div>
                      <h2>Peak Playing Hours</h2>
                      <p className="muted">When your community takes to the court</p>
                    </div>
                    <span className="panel-period">Asia/Manila</span>
                  </div>
                  <HourChart
                    data={data.peakHours.filter((row) => row.hour >= 6 && row.hour <= 22)}
                  />
                </Card>
              </div>
            ) : (
              <Card>
                <EmptyState
                  title="Your club’s story starts here"
                  description="Complete matches and record their results to see activity patterns."
                />
              </Card>
            )}
            <p className="analytics-note">
              All figures are computed from MongoDB records. Court usage counts completed matches;
              daily counts use completion dates and hourly counts use start times.
            </p>
          </>
        )}
      </DataState>
    </>
  );
}
