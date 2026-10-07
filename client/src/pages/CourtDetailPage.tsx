import { useAuth } from '../auth';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, MapPin, Pencil, Trash2, ListOrdered } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useLiveQueue } from '../hooks/useLiveQueue';
import { useMutation } from '../hooks/useMutation';
import { api } from '../services/api';
import type { Court } from '../types';
import {
  Avatar,
  Button,
  Card,
  ConfirmDialog,
  DataState,
  EmptyState,
  Modal,
  StatusBadge,
  Table,
} from '../components/ui';
import { CourtForm } from '../components/ui/EntityForms';
import { QueueCard } from '../components/queue/QueueCard';
import { capitalize, timeLabel } from '../utils/format';
export function CourtDetailPage() {
  const { account } = useAuth();
  const admin = account?.role === 'admin';
  const { id } = useParams();
  const navigate = useNavigate();
  const state = useApi<Court>(`/courts/${id}`);
  const queue = useLiveQueue(id);
  const mutation = useMutation();
  const [tab, setTab] = useState('overview');
  const [edit, setEdit] = useState(false);
  const [remove, setRemove] = useState(false);
  const court = state.data;
  return (
    <>
      <Link className="back-link" to="/courts">
        <ArrowLeft size={15} />
        Back to Courts
      </Link>
      <DataState {...state} hasData={!!court} onRetry={state.refetch}>
        {court && (
          <>
            <img
              className="detail-banner"
              src="/pickleball-courts.jpg"
              alt={`${court.name} court overview`}
            />
            <div className="detail-heading">
              <div>
                <h1>{court.name}</h1>
                <div className="detail-subtitle">
                  <span>
                    <MapPin size={15} />
                    {court.location}
                  </span>
                  <span>Court {String(court.courtNumber).padStart(2, '0')}</span>
                  <StatusBadge status={court.status} />
                </div>
              </div>
              {admin && (
                <div className="page-actions">
                  <Button variant="secondary" onClick={() => setEdit(true)}>
                    <Pencil size={15} />
                    Edit Court
                  </Button>
                  <Button variant="ghost" aria-label="Delete court" onClick={() => setRemove(true)}>
                    <Trash2 size={17} />
                  </Button>
                </div>
              )}
            </div>
            <div className="section-tabs" role="tablist" aria-label="Court information">
              {['overview', 'schedule', 'live queue'].map((value) => (
                <button
                  role="tab"
                  aria-selected={tab === value}
                  key={value}
                  className={tab === value ? 'active' : ''}
                  onClick={() => setTab(value)}
                >
                  {capitalize(value)}
                </button>
              ))}
            </div>
            {tab === 'overview' && (
              <div className="detail-grid">
                <Card className="panel">
                  <h2>About this court</h2>
                  <p className="muted" style={{ margin: '12px 0 25px' }}>
                    A place for focused rallies, friendly competition, and a great day of
                    pickleball.
                  </p>
                  <dl className="info-grid">
                    <div>
                      <dt>Court number</dt>
                      <dd>{court.courtNumber}</dd>
                    </div>
                    <div>
                      <dt>Type</dt>
                      <dd>{capitalize(court.type)}</dd>
                    </div>
                    <div>
                      <dt>Opening time</dt>
                      <dd>{timeLabel(court.openingTime)}</dd>
                    </div>
                    <div>
                      <dt>Closing time</dt>
                      <dd>{timeLabel(court.closingTime)}</dd>
                    </div>
                    <div>
                      <dt>Location</dt>
                      <dd>{court.location}</dd>
                    </div>
                    <div>
                      <dt>Players waiting</dt>
                      <dd>{court.queueCount || 0}</dd>
                    </div>
                  </dl>
                </Card>
                <Card className="panel quick-actions">
                  <h2>Your next game</h2>
                  <p className="muted">Pick a time or take your place in the live queue.</p>
                  {court.status !== 'maintenance' ? (
                    <>
                      <Link
                        to={`/reservations/new?court=${court._id}`}
                        className="button button-primary"
                      >
                        <CalendarDays size={17} />
                        Reserve Court
                      </Link>
                      <Link to={`/queue?court=${court._id}`} className="button button-secondary">
                        <ListOrdered size={17} />
                        Join Queue
                      </Link>
                    </>
                  ) : (
                    <p className="booking-note">
                      Reservations and queue entries are paused while this court is under
                      maintenance.
                    </p>
                  )}
                </Card>
              </div>
            )}
            {tab !== 'live queue' && (
              <section className="section-gap">
                <div className="panel-heading">
                  <h2>Today’s Schedule</h2>
                  <Link className="text-link" to={`/reservations?court=${court._id}`}>
                    All reservations
                  </Link>
                </div>
                {court.schedule?.length ? (
                  <Table headers={['Player', 'Time', 'Status']}>
                    <>
                      {court.schedule.map((reservation) => (
                        <tr key={reservation._id}>
                          <td data-label="Player">
                            <div className="table-person">
                              <Avatar
                                name={reservation.playerId.name}
                                id={reservation.playerId._id}
                              />
                              <strong>{reservation.playerId.name}</strong>
                            </div>
                          </td>
                          <td data-label="Time">
                            {timeLabel(reservation.startTime)} – {timeLabel(reservation.endTime)}
                          </td>
                          <td data-label="Status">
                            <StatusBadge status={reservation.status} />
                          </td>
                        </tr>
                      ))}
                    </>
                  </Table>
                ) : (
                  <Card>
                    <EmptyState
                      title="Your court, your schedule"
                      description="No reservations are booked for today."
                    />
                  </Card>
                )}
              </section>
            )}
            {tab === 'live queue' && (
              <DataState {...queue} hasData={!!queue.data} onRetry={queue.refetch}>
                {queue.data?.[0] && (
                  <>
                    <QueueCard summary={queue.data[0]} />
                    <div className="section-gap">
                      <Link className="button button-primary" to={`/queue?court=${court._id}`}>
                        View Live Queue
                      </Link>
                    </div>
                  </>
                )}
              </DataState>
            )}
            {edit && (
              <Modal title="Edit Court" onClose={() => setEdit(false)}>
                <CourtForm
                  court={court}
                  onCancel={() => setEdit(false)}
                  onDone={() => {
                    setEdit(false);
                    void state.refetch();
                    void queue.refetch();
                  }}
                />
              </Modal>
            )}
            {remove && (
              <ConfirmDialog
                title="Delete Court?"
                busy={mutation.busy}
                onClose={() => setRemove(false)}
                onConfirm={() =>
                  mutation.run(
                    () => api.delete(`/courts/${court._id}`),
                    'Court deleted successfully.',
                    () => navigate('/courts'),
                  )
                }
              />
            )}
          </>
        )}
      </DataState>
    </>
  );
}
