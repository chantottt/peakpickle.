import { useAuth } from '../auth';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useMutation } from '../hooks/useMutation';
import { api } from '../services/api';
import type { Reservation, Court } from '../types';
import {
  PageHeader,
  SearchBar,
  FilterSelect,
  Input,
  DataState,
  Table,
  Avatar,
  StatusBadge,
  Button,
  ConfirmDialog,
  EmptyState,
  Modal,
} from '../components/ui';
import { queryString, capitalize, dateLabel, timeLabel } from '../utils/format';
export function ReservationsPage() {
  const { account } = useAuth();
  const admin = account?.role === 'admin';
  const [params] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [courtId, setCourtId] = useState(params.get('court') || '');
  const [date, setDate] = useState('');
  const [remove, setRemove] = useState<Reservation | null>(null);
  const [view, setView] = useState<Reservation | null>(null);
  const mutation = useMutation();
  const state = useApi<Reservation[]>(
    `/reservations?${queryString({ search, status, courtId, date })}`,
  );
  const courts = useApi<Court[]>('/courts');
  return (
    <>
      <PageHeader
        title="Reservations"
        description="Plan your play. Keep every court on schedule."
        action={
          <Link to="/reservations/new" className="button button-primary">
            <Plus size={17} />
            New Reservation
          </Link>
        }
      />
      <div className="filters">
        <SearchBar value={search} onChange={setSearch} placeholder="Search player or court…" />
        <FilterSelect
          value={status}
          onChange={setStatus}
          label="All Status"
          options={['pending', 'confirmed', 'completed', 'cancelled'].map((value) => ({
            value,
            label: capitalize(value),
          }))}
        />
        <FilterSelect
          value={courtId}
          onChange={setCourtId}
          label="All Courts"
          options={courts.data?.map((court) => ({ value: court._id, label: court.name })) || []}
        />
        <Input
          type="date"
          aria-label="Reservation date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </div>
      <DataState
        loading={state.loading || courts.loading}
        error={state.error || courts.error}
        hasData={!!state.data && !!courts.data}
        onRetry={() => {
          void state.refetch();
          void courts.refetch();
        }}
      >
        {state.data?.length ? (
          <>
            <Table headers={['Player', 'Court', 'Date', 'Time', 'Status', 'Actions']}>
              <>
                {state.data.map((reservation) => (
                  <tr key={reservation._id}>
                    <td data-label="Player">
                      <div className="table-person">
                        <Avatar name={reservation.playerId.name} id={reservation.playerId._id} />
                        <div>
                          <strong>{reservation.playerId.name}</strong>
                          <small>{capitalize(reservation.playerId.skillLevel)}</small>
                        </div>
                      </div>
                    </td>
                    <td data-label="Court">
                      <strong>{reservation.courtId.name}</strong>
                      <small className="muted" style={{ display: 'block' }}>
                        Court {reservation.courtId.courtNumber}
                      </small>
                    </td>
                    <td data-label="Date">{dateLabel(reservation.reservationDate)}</td>
                    <td data-label="Time">
                      {timeLabel(reservation.startTime)} – {timeLabel(reservation.endTime)}
                    </td>
                    <td data-label="Status">
                      <StatusBadge status={reservation.status} />
                    </td>
                    <td data-label="Actions">
                      <div className="row-actions">
                        <Button
                          variant="ghost"
                          aria-label={`View reservation for ${reservation.playerId.name}`}
                          onClick={() => setView(reservation)}
                        >
                          <Eye size={15} />
                        </Button>
                        {['pending', 'confirmed'].includes(reservation.status) && (
                          <Link
                            className="button button-ghost"
                            aria-label={`Edit reservation for ${reservation.playerId.name}`}
                            to={`/reservations/${reservation._id}/edit`}
                          >
                            <Pencil size={15} />
                          </Link>
                        )}
                        {admin && (
                          <Button
                            variant="ghost"
                            aria-label={`Delete reservation for ${reservation.playerId.name}`}
                            onClick={() => setRemove(reservation)}
                          >
                            <Trash2 size={15} />
                          </Button>
                        )}
                        {!admin && ['pending', 'confirmed'].includes(reservation.status) && (
                          <Button
                            variant="ghost"
                            aria-label={`Cancel reservation for ${reservation.playerId.name}`}
                            onClick={() => setRemove(reservation)}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </>
            </Table>
            <p className="table-footnote">
              {state.data.length} reservations · All times are in Asia/Manila.
            </p>
          </>
        ) : (
          <CardEmpty />
        )}
      </DataState>
      {remove && (
        <ConfirmDialog
          title={admin ? 'Delete Reservation?' : 'Cancel Reservation?'}
          confirmLabel={admin ? 'Delete' : 'Cancel booking'}
          onClose={() => setRemove(null)}
          busy={mutation.busy}
          onConfirm={() =>
            mutation.run(
              () =>
                admin
                  ? api.delete(`/reservations/${remove._id}`)
                  : api.patch(`/reservations/${remove._id}`, { status: 'cancelled' }),
              admin ? 'Reservation deleted successfully.' : 'Reservation cancelled successfully.',
              () => {
                setRemove(null);
                void state.refetch();
              },
            )
          }
        />
      )}
      {view && (
        <Modal title="Reservation Details" onClose={() => setView(null)}>
          <dl className="info-grid">
            <div>
              <dt>Player</dt>
              <dd>{view.playerId.name}</dd>
            </div>
            <div>
              <dt>Court</dt>
              <dd>{view.courtId.name}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{dateLabel(view.reservationDate)}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>
                {timeLabel(view.startTime)} – {timeLabel(view.endTime)}
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <StatusBadge status={view.status} />
              </dd>
            </div>
          </dl>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setView(null)}>
              Close
            </Button>
            {['pending', 'confirmed'].includes(view.status) && (
              <Link className="button button-primary" to={`/reservations/${view._id}/edit`}>
                Edit Reservation
              </Link>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
function CardEmpty() {
  return (
    <EmptyState
      title="No reservations found"
      description="Try another filter, or book your next game."
      action={
        <Link className="button button-primary" to="/reservations/new">
          New Reservation
        </Link>
      }
    />
  );
}
