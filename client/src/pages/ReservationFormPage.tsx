import { useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CheckCircle2, CalendarDays } from 'lucide-react';
import { reservationSchema, type ReservationFormValues } from '../schemas/forms';
import { useApi } from '../hooks/useApi';
import { useCourtAvailability } from '../hooks/useCourtAvailability';
import { api, errorMessage } from '../services/api';
import type { Reservation, Player } from '../types';
import {
  Button,
  Card,
  DataState,
  Field,
  FormError,
  Input,
  PageHeader,
  Select,
  LoadingSpinner,
} from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { dateLabel, timeLabel, today } from '../utils/format';
export function ReservationFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const record = useApi<Reservation>(id ? `/reservations/${id}` : null);
  const players = useApi<Player[]>('/players');
  const {
    register,
    reset,
    setValue,
    watch,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      playerId: params.get('player') || '',
      courtId: params.get('court') || '',
      reservationDate: today(),
      startTime: '09:00',
      endTime: '10:00',
      status: 'confirmed',
    },
  });
  useEffect(() => {
    if (record.data) {
      const row = record.data;
      reset({
        playerId: row.playerId._id,
        courtId: row.courtId._id,
        reservationDate: row.reservationDate,
        startTime: row.startTime,
        endTime: row.endTime,
        status: row.status,
      });
    }
  }, [record.data, reset]);
  const values = watch();
  const availability = useCourtAvailability(
    values.reservationDate,
    values.startTime,
    values.endTime,
    id,
  );
  useEffect(() => {
    if (
      !availability.loading &&
      availability.data &&
      values.courtId &&
      !availability.data.some((court) => court._id === values.courtId)
    )
      setValue('courtId', '', { shouldValidate: false });
  }, [availability.data, availability.loading, values.courtId, setValue]);
  const selectedCourt = availability.data?.find((court) => court._id === values.courtId);
  const selectedPlayer = players.data?.find((player) => player._id === values.playerId);
  const submit = async (data: ReservationFormValues) => {
    try {
      if (id) await api.patch(`/reservations/${id}`, data);
      else await api.post('/reservations', data);
      toast(`Reservation ${id ? 'updated' : 'created'} successfully.`);
      navigate('/reservations');
    } catch (cause) {
      setError('root', { message: errorMessage(cause) });
      void availability.refetch();
    }
  };
  const statuses = !id
    ? ['pending', 'confirmed']
    : record.data?.status === 'pending'
      ? ['pending', 'confirmed', 'cancelled']
      : record.data?.status === 'confirmed'
        ? ['confirmed', 'completed', 'cancelled']
        : [record.data?.status || 'confirmed'];
  const finalized = record.data && ['completed', 'cancelled'].includes(record.data.status);
  return (
    <>
      <Link to="/reservations" className="back-link">
        <ArrowLeft size={15} />
        Back to Reservations
      </Link>
      <PageHeader
        title={id ? 'Edit Reservation' : 'New Court Reservation'}
        description="Pick your time. We’ll find an open court."
      />
      <DataState
        loading={record.loading || players.loading}
        error={record.error || players.error}
        hasData={!!players.data && (!id || !!record.data)}
        onRetry={() => {
          void record.refetch();
          void players.refetch();
        }}
      >
        <div className="reservation-layout">
          <Card className="reservation-form-card">
            <h2>{id ? 'Update your booking' : 'Book your next game'}</h2>
            <p className="muted">All court times use Asia/Manila.</p>
            <form onSubmit={handleSubmit(submit)} noValidate>
              <div className="form-grid">
                <Field label="Player" error={errors.playerId?.message}>
                  <Select {...register('playerId')} disabled={!!finalized}>
                    <option value="">Select a player</option>
                    {players.data
                      ?.filter((player) => player.isActive)
                      .map((player) => (
                        <option key={player._id} value={player._id}>
                          {player.name}
                        </option>
                      ))}
                  </Select>
                </Field>
                <Field label="Date" error={errors.reservationDate?.message}>
                  <Input type="date" {...register('reservationDate')} disabled={!!finalized} />
                </Field>
                <Field label="Start Time" error={errors.startTime?.message}>
                  <Input type="time" {...register('startTime')} disabled={!!finalized} />
                </Field>
                <Field label="End Time" error={errors.endTime?.message}>
                  <Input type="time" {...register('endTime')} disabled={!!finalized} />
                </Field>
                <Field label="Available Court" error={errors.courtId?.message}>
                  <Select
                    {...register('courtId')}
                    disabled={availability.loading || !!availability.error || !!finalized}
                  >
                    <option value="">
                      {availability.loading
                        ? 'Checking availability…'
                        : 'Select an available court'}
                    </option>
                    {availability.data?.map((court) => (
                      <option key={court._id} value={court._id}>
                        {court.name} · {court.type}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Status" error={errors.status?.message}>
                  <Select {...register('status')} disabled={!!finalized}>
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              {availability.loading ? (
                <div className="availability-note">
                  <LoadingSpinner />
                </div>
              ) : availability.error ? (
                <div className="availability-note availability-error" role="alert">
                  {availability.error}
                  <Button type="button" variant="ghost" onClick={availability.refetch}>
                    Retry
                  </Button>
                </div>
              ) : (
                availability.data && (
                  <p className="availability-note">
                    <CheckCircle2 size={16} />
                    {availability.data.length
                      ? `${availability.data.length} courts are available for your selected time.`
                      : 'No courts are available. Try another time.'}
                  </p>
                )
              )}
              {finalized && (
                <p className="booking-note">
                  This reservation is finalized. Create a new reservation for your next game.
                </p>
              )}
              <FormError message={errors.root?.message} />
              <div className="form-actions">
                <Link className="button button-secondary" to="/reservations">
                  Cancel
                </Link>
                <Button
                  type="submit"
                  busy={isSubmitting}
                  disabled={
                    availability.loading ||
                    !!availability.error ||
                    !availability.data?.length ||
                    !!finalized
                  }
                >
                  {id ? 'Save Changes' : 'Create Reservation'}
                </Button>
              </div>
            </form>
          </Card>
          <Card className="booking-summary">
            <span className="eyebrow">YOUR NEXT GAME</span>
            <h2>Reservation Summary</h2>
            <img src="/pickleball-courts.jpg" alt="Pickleball court" />
            <h3>{selectedCourt?.name || 'Choose your court'}</h3>
            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              {selectedCourt?.location || 'Available courts appear after you choose a time.'}
            </p>
            <div className="booking-summary-list">
              <div>
                <span>Player</span>
                <strong>{selectedPlayer?.name || '—'}</strong>
              </div>
              <div>
                <span>Date</span>
                <strong>
                  {/^\d{4}-\d{2}-\d{2}$/.test(values.reservationDate)
                    ? dateLabel(values.reservationDate)
                    : '—'}
                </strong>
              </div>
              <div>
                <span>Time</span>
                <strong>
                  {values.startTime && values.endTime
                    ? `${timeLabel(values.startTime)} – ${timeLabel(values.endTime)}`
                    : '—'}
                </strong>
              </div>
            </div>
            <p className="booking-note">
              <CalendarDays size={16} style={{ display: 'inline', marginRight: 6 }} />
              Availability is checked again when you save, so every reservation gets its own slot.
            </p>
          </Card>
        </div>
      </DataState>
    </>
  );
}
