import { useAuth } from '../auth';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ListOrdered, Plus, Play, CheckCircle2, SkipForward, LogOut } from 'lucide-react';
import { useLiveQueue } from '../hooks/useLiveQueue';
import { useApi } from '../hooks/useApi';
import { useMutation } from '../hooks/useMutation';
import { api } from '../services/api';
import type { Player, Match } from '../types';
import {
  PageHeader,
  Button,
  Card,
  DataState,
  EmptyState,
  Modal,
  Table,
  Avatar,
  Badge,
  StatusBadge,
  Select,
} from '../components/ui';
import { JoinQueueForm, ResultForm } from '../components/ui/EntityForms';
import { QueueCard } from '../components/queue/QueueCard';
import { timeLabel } from '../utils/format';
import { WaitIndicator } from '../components/queue/WaitIndicator';
export function QueuePage() {
  const { account } = useAuth();
  const admin = account?.role === 'admin';
  const [params] = useSearchParams();
  const [selected, setSelected] = useState(params.get('court') || '');
  const [join, setJoin] = useState(false);
  const [preferredPlayType, setPreferredPlayType] = useState('doubles');
  const [result, setResult] = useState<Match | null>(null);
  const state = useLiveQueue();
  const players = useApi<Player[]>('/players');
  const mutation = useMutation();
  const summary = state.data?.find((row) => row.court._id === selected) || state.data?.[0];
  const courtId = summary?.court._id;
  const waiting = summary?.entries.filter((entry) => entry.status !== 'playing') || [];
  const calledCount = waiting.filter((entry) => entry.status === 'called').length;
  const calledEntry = waiting.find((entry) => entry.status === 'called');
  const playType = calledEntry ? calledEntry.playType || 'singles' : preferredPlayType;
  const groupSize = playType === 'doubles' ? 4 : 2;
  const firstWaiting = waiting.find((entry) => entry.status === 'waiting');
  const refresh = () => {
    void state.refetch();
    void players.refetch();
  };
  return (
    <>
      <PageHeader
        title="Live Queue"
        description="Find your place. Keep the game moving."
        action={
          <>
            <span className="live-label">
              <span />
              Updates every 15 seconds
            </span>
            <Button
              onClick={() => setJoin(true)}
              disabled={!summary || summary.court.status === 'maintenance'}
            >
              <Plus size={17} />
              Join Queue
            </Button>
          </>
        }
      />
      <DataState
        loading={state.loading || players.loading}
        error={state.error || players.error}
        hasData={!!state.data && !!players.data}
        onRetry={refresh}
      >
        {!summary ? (
          <EmptyState
            title="No courts available"
            description="Add a court to begin your live queue."
          />
        ) : (
          <>
            <div className="court-tabs" role="tablist" aria-label="Choose a court">
              {state.data?.map((row) => (
                <button
                  role="tab"
                  aria-selected={row.court._id === courtId}
                  className={row.court._id === courtId ? 'active' : ''}
                  key={row.court._id}
                  onClick={() => setSelected(row.court._id)}
                >
                  {row.court.name}
                  <small>{row.waitingCount}</small>
                </button>
              ))}
            </div>
            <div className="queue-top-grid">
              <QueueCard summary={summary} />
              <Card className="queue-stats">
                <h2>Queue at a glance</h2>
                <div className="queue-stats-grid">
                  <div>
                    <strong>{summary.waitingCount}</strong>
                    <span>Waiting & called</span>
                  </div>
                  <div>
                    <strong>
                      {summary.averageMatchDuration}
                      <small style={{ fontSize: 13 }}> min</small>
                    </strong>
                    <span>Average match duration</span>
                  </div>
                  <div>
                    <strong>{calledCount}</strong>
                    <span>Called to play</span>
                  </div>
                  <div>
                    <strong>
                      {waiting.at(-1)?.estimatedWait || 0}
                      <small style={{ fontSize: 13 }}> min</small>
                    </strong>
                    <span>Last player’s estimated wait</span>
                  </div>
                </div>
                <p className="muted">
                  First to join, first to play. Wait times use actual completed match durations.
                </p>
              </Card>
            </div>
            <div className="queue-controls">
              <h2>
                Waiting Queue <Badge>{waiting.length}</Badge>
              </h2>
              {admin && (
                <div>
                  <Select
                    aria-label="Queue play type"
                    value={playType}
                    disabled={calledCount > 0 || mutation.busy}
                    onChange={(event) => setPreferredPlayType(event.target.value)}
                  >
                    <option value="doubles">Doubles · 4 players</option>
                    <option value="singles">Singles · 2 players</option>
                  </Select>
                  <Button
                    variant="secondary"
                    busy={mutation.busy}
                    disabled={
                      summary.court.status === 'maintenance' ||
                      calledCount > 0 ||
                      waiting.filter((entry) => entry.status === 'waiting').length < groupSize
                    }
                    onClick={() =>
                      mutation.run(
                        () => api.post(`/queue-entries/courts/${courtId}/call-next`, { playType }),
                        `Next ${groupSize} players called.`,
                        refresh,
                      )
                    }
                  >
                    <ListOrdered size={16} />
                    Call Next
                  </Button>
                  <Button
                    busy={mutation.busy}
                    disabled={calledCount !== groupSize || summary.court.status !== 'available'}
                    onClick={() =>
                      mutation.run(
                        () => api.post(`/queue-entries/courts/${courtId}/start-match`),
                        'Match started successfully.',
                        refresh,
                      )
                    }
                  >
                    <Play size={15} />
                    Start Match
                  </Button>
                  {summary.currentMatch && (
                    <Button onClick={() => setResult(summary.currentMatch)}>
                      <CheckCircle2 size={16} />
                      Complete
                    </Button>
                  )}
                </div>
              )}
            </div>
            <p className="table-footnote">
              {playType === 'doubles'
                ? 'Doubles: first two called players form Team A; next two form Team B.'
                : 'Singles: one player on each side.'}{' '}
              {calledCount > 0 &&
                `${calledCount} of ${groupSize} players called. Skip a player and call the next waiter to replace them.`}
            </p>
            {waiting.length ? (
              <Table
                headers={['Position', 'Player', 'Joined At', 'Estimated Wait', 'Status', 'Actions']}
              >
                <>
                  {waiting.map((entry) => (
                    <tr key={entry._id}>
                      <td data-label="Position">
                        <span
                          className={`queue-position ${entry.position === 1 ? 'queue-position-first' : ''}`}
                        >
                          {entry.position}
                        </span>
                      </td>
                      <td data-label="Player">
                        <div className="table-person">
                          <Avatar name={entry.playerId.name} id={entry.playerId._id} />
                          <div>
                            <strong>{entry.playerId.name}</strong>
                            <small>{entry.playerId.skillLevel}</small>
                          </div>
                        </div>
                      </td>
                      <td data-label="Joined At">
                        {timeLabel(entry.joinedAt)}
                        <WaitIndicator joinedAt={entry.joinedAt} />
                      </td>
                      <td data-label="Estimated Wait">
                        <strong>
                          {entry.status === 'called' ? 'Your turn' : `~ ${entry.estimatedWait} min`}
                        </strong>
                      </td>
                      <td data-label="Status">
                        <StatusBadge status={entry.status} />
                      </td>
                      <td data-label="Actions">
                        <div className="row-actions">
                          {entry.status === 'waiting' &&
                            (admin || entry.playerId._id === account?.playerId) && (
                              <>
                                {admin && (
                                  <Button
                                    variant="ghost"
                                    busy={mutation.busy}
                                    disabled={
                                      firstWaiting?._id !== entry._id ||
                                      calledCount >= groupSize ||
                                      summary.court.status === 'maintenance'
                                    }
                                    onClick={() =>
                                      mutation.run(
                                        () =>
                                          api.patch(`/queue-entries/${entry._id}`, {
                                            status: 'called',
                                            playType,
                                          }),
                                        'Player called to court.',
                                        refresh,
                                      )
                                    }
                                  >
                                    Call
                                  </Button>
                                )}
                                <Button
                                  variant="secondary"
                                  busy={mutation.busy}
                                  onClick={() =>
                                    mutation.run(
                                      () =>
                                        api.patch(`/queue-entries/${entry._id}`, {
                                          status: 'cancelled',
                                        }),
                                      'Player left the queue.',
                                      refresh,
                                    )
                                  }
                                >
                                  <LogOut size={13} />
                                  Leave
                                </Button>
                              </>
                            )}
                          {admin && entry.status === 'called' && (
                            <Button
                              variant="secondary"
                              busy={mutation.busy}
                              onClick={() =>
                                mutation.run(
                                  () =>
                                    api.patch(`/queue-entries/${entry._id}`, { status: 'skipped' }),
                                  'Player skipped. Call the next waiting player.',
                                  refresh,
                                )
                              }
                            >
                              <SkipForward size={13} />
                              Skip
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              </Table>
            ) : (
              <Card>
                <EmptyState
                  title="No players are currently waiting."
                  description="Be the first to join the queue."
                  action={
                    <Button
                      onClick={() => setJoin(true)}
                      disabled={summary.court.status === 'maintenance'}
                    >
                      Join Queue
                    </Button>
                  }
                />
              </Card>
            )}
            <p className="table-footnote">
              Positions include playing entries until their match is completed. Estimates may change
              as games finish.
            </p>
            {join && players.data && (
              <Modal title={`Join ${summary.court.name}`} onClose={() => setJoin(false)}>
                <JoinQueueForm
                  courtId={summary.court._id}
                  players={players.data}
                  onCancel={() => setJoin(false)}
                  onDone={() => {
                    setJoin(false);
                    refresh();
                  }}
                />
              </Modal>
            )}
          </>
        )}
      </DataState>
      {result && (
        <Modal title="Record Match Result" onClose={() => setResult(null)}>
          <ResultForm
            match={result}
            onCancel={() => setResult(null)}
            onDone={() => {
              setResult(null);
              refresh();
            }}
          />
        </Modal>
      )}
    </>
  );
}
