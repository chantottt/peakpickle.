import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api, errorMessage } from '../../services/api';
import {
  playerSchema,
  courtSchema,
  matchSchema,
  resultSchema,
  joinQueueSchema,
  type PlayerFormValues,
  type CourtFormValues,
  type MatchFormValues,
  type ResultFormValues,
  type JoinQueueValues,
} from '../../schemas/forms';
import type { Player, Court, Match } from '../../types';
import { Button, Field, Input, Select, FormError, DataState, Avatar } from '.';
import { useToast } from './Toast';
import { useApi } from '../../hooks/useApi';
import { capitalize, teamNames, today } from '../../utils/format';
function FormActions({
  editing,
  busy,
  onCancel,
  label,
}: {
  editing?: boolean;
  busy: boolean;
  onCancel: () => void;
  label?: string;
}) {
  return (
    <div className="form-actions">
      <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" busy={busy}>
        {label || (editing ? 'Save Changes' : 'Create')}
      </Button>
    </div>
  );
}
export function PlayerForm({
  player,
  onDone,
  onCancel,
}: {
  player?: Player;
  onDone: () => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PlayerFormValues>({
    resolver: zodResolver(playerSchema),
    defaultValues: player
      ? {
          name: player.name,
          email: player.email,
          skillLevel: player.skillLevel,
          preferredPlay: player.preferredPlay,
          availability: player.availability as PlayerFormValues['availability'],
          isActive: player.isActive,
        }
      : {
          skillLevel: 'intermediate',
          preferredPlay: 'doubles',
          availability: ['evening'],
          isActive: true,
        },
  });
  const submit = async (values: PlayerFormValues) => {
    try {
      if (player) await api.patch(`/players/${player._id}`, values);
      else await api.post('/players', values);
      toast(`Player ${player ? 'updated' : 'created'} successfully.`);
      onDone();
    } catch (cause) {
      setError('root', { message: errorMessage(cause) });
    }
  };
  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <div className="form-grid">
        <Field label="Player name" error={errors.name?.message}>
          <Input placeholder="e.g. Miguel Santos" {...register('name')} />
        </Field>
        <Field label="Email address" error={errors.email?.message}>
          <Input type="email" placeholder="player@example.com" {...register('email')} />
        </Field>
        <Field label="Skill level" error={errors.skillLevel?.message}>
          <Select {...register('skillLevel')}>
            {['beginner', 'intermediate', 'advanced'].map((value) => (
              <option key={value} value={value}>
                {capitalize(value)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Preferred play" error={errors.preferredPlay?.message}>
          <Select {...register('preferredPlay')}>
            {['singles', 'doubles', 'both'].map((value) => (
              <option key={value} value={value}>
                {capitalize(value)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <fieldset className="checkbox-field">
        <legend>Available times</legend>
        {['morning', 'afternoon', 'evening'].map((value) => (
          <label key={value}>
            <input type="checkbox" value={value} {...register('availability')} />
            {capitalize(value)}
          </label>
        ))}
        {errors.availability && (
          <small className="field-error">{errors.availability.message}</small>
        )}
      </fieldset>
      <label className="check-label">
        <input type="checkbox" {...register('isActive')} />
        Active player
      </label>
      <FormError message={errors.root?.message} />
      <FormActions
        editing={!!player}
        busy={isSubmitting}
        onCancel={onCancel}
        label={player ? 'Save Changes' : 'Create Player'}
      />
    </form>
  );
}
export function CourtForm({
  court,
  onDone,
  onCancel,
}: {
  court?: Court;
  onDone: () => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CourtFormValues>({
    resolver: zodResolver(courtSchema),
    defaultValues: court
      ? {
          name: court.name,
          courtNumber: court.courtNumber,
          location: court.location,
          type: court.type,
          status: court.status,
          openingTime: court.openingTime,
          closingTime: court.closingTime,
        }
      : { type: 'outdoor', status: 'available', openingTime: '06:00', closingTime: '22:00' },
  });
  const submit = async (values: CourtFormValues) => {
    try {
      if (court) await api.patch(`/courts/${court._id}`, values);
      else await api.post('/courts', values);
      toast(`Court ${court ? 'updated' : 'created'} successfully.`);
      onDone();
    } catch (cause) {
      setError('root', { message: errorMessage(cause) });
    }
  };
  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <div className="form-grid">
        <Field label="Court name" error={errors.name?.message}>
          <Input {...register('name')} placeholder="e.g. Riverside Court" />
        </Field>
        <Field label="Court number" error={errors.courtNumber?.message}>
          <Input type="number" min={1} {...register('courtNumber', { valueAsNumber: true })} />
        </Field>
        <Field label="Location" error={errors.location?.message}>
          <Input {...register('location')} placeholder="City or club location" />
        </Field>
        <Field label="Type" error={errors.type?.message}>
          <Select {...register('type')}>
            <option value="outdoor">Outdoor</option>
            <option value="indoor">Indoor</option>
          </Select>
        </Field>
        <Field label="Opening time" error={errors.openingTime?.message}>
          <Input type="time" {...register('openingTime')} />
        </Field>
        <Field label="Closing time" error={errors.closingTime?.message}>
          <Input type="time" {...register('closingTime')} />
        </Field>
        <Field
          label="Court status"
          error={errors.status?.message}
          hint="Occupied status is managed by ongoing matches."
        >
          <Select {...register('status')} disabled={court?.status === 'occupied'}>
            <option value="available">Available</option>
            <option value="maintenance">Maintenance</option>
            {court?.status === 'occupied' && <option value="occupied">Occupied</option>}
          </Select>
        </Field>
      </div>
      <FormError message={errors.root?.message} />
      <FormActions
        editing={!!court}
        busy={isSubmitting}
        onCancel={onCancel}
        label={court ? 'Save Changes' : 'Create Court'}
      />
    </form>
  );
}
export function MatchForm({
  match,
  onDone,
  onCancel,
}: {
  match?: Match;
  onDone: () => void;
  onCancel: () => void;
}) {
  const players = useApi<Player[]>('/players');
  const courts = useApi<Court[]>('/courts');
  const toast = useToast();
  const {
    register,
    watch,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MatchFormValues>({
    resolver: zodResolver(matchSchema),
    defaultValues: match
      ? {
          courtId: match.courtId._id,
          playType: match.playType,
          scheduledAt: new Intl.DateTimeFormat('sv-SE', {
            timeZone: 'Asia/Manila',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
          })
            .format(new Date(match.scheduledAt))
            .replace(' ', 'T'),
          playerOne: match.players[0]?._id,
          playerTwo: match.players[1]?._id,
          playerThree: match.players[2]?._id || '',
          playerFour: match.players[3]?._id || '',
        }
      : { playType: 'singles', scheduledAt: today() + 'T18:00', playerThree: '', playerFour: '' },
  });
  const playType = watch('playType');
  const submit = async (values: MatchFormValues) => {
    const payload = {
      courtId: values.courtId,
      playType: values.playType,
      scheduledAt: new Date(values.scheduledAt + ':00+08:00').toISOString(),
      players:
        values.playType === 'singles'
          ? [values.playerOne, values.playerTwo]
          : [values.playerOne, values.playerTwo, values.playerThree, values.playerFour],
    };
    try {
      if (match) await api.patch(`/matches/${match._id}`, payload);
      else await api.post('/matches', payload);
      toast(`Match ${match ? 'updated' : 'scheduled'} successfully.`);
      onDone();
    } catch (cause) {
      setError('root', { message: errorMessage(cause) });
    }
  };
  const fields =
    playType === 'singles'
      ? (['playerOne', 'playerTwo'] as const)
      : (['playerOne', 'playerTwo', 'playerThree', 'playerFour'] as const);
  return (
    <DataState
      loading={players.loading || courts.loading}
      error={players.error || courts.error}
      hasData={!!players.data && !!courts.data}
      onRetry={() => {
        void players.refetch();
        void courts.refetch();
      }}
    >
      <form onSubmit={handleSubmit(submit)} noValidate>
        <div className="form-grid">
          <Field label="Court" error={errors.courtId?.message}>
            <Select {...register('courtId')}>
              <option value="">Select a court</option>
              {courts.data
                ?.filter((court) => court.status !== 'maintenance')
                .map((court) => (
                  <option key={court._id} value={court._id}>
                    {court.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Play type" error={errors.playType?.message}>
            <Select {...register('playType')}>
              <option value="singles">Singles</option>
              <option value="doubles">Doubles</option>
            </Select>
          </Field>
          <Field label="Date & time (Manila)" error={errors.scheduledAt?.message}>
            <Input type="datetime-local" {...register('scheduledAt')} />
          </Field>
        </div>
        <div className="form-section-title">
          {playType === 'singles' ? 'Players' : 'Teams · Team A is players 1 & 2'}
        </div>
        <div className="form-grid">
          {fields.map((field, position) => (
            <Field
              key={field}
              label={
                playType === 'singles'
                  ? position === 0
                    ? 'Player A'
                    : 'Player B'
                  : `${position < 2 ? 'Team A' : 'Team B'} · Player ${position + 1}`
              }
              error={errors[field]?.message}
            >
              <Select {...register(field)}>
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
          ))}
        </div>
        <FormError message={errors.root?.message} />
        <FormActions
          busy={isSubmitting}
          onCancel={onCancel}
          label={match ? 'Save Changes' : 'Schedule Match'}
        />
      </form>
    </DataState>
  );
}
export function ResultForm({
  match,
  onDone,
  onCancel,
}: {
  match: Match;
  onDone: () => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const names = teamNames(match);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResultFormValues>({
    resolver: zodResolver(resultSchema),
    defaultValues: { teamOneScore: 11, teamTwoScore: 0 },
  });
  const submit = async (values: ResultFormValues) => {
    try {
      await api.post('/match-results', { matchId: match._id, ...values });
      toast('Match result recorded successfully.');
      onDone();
    } catch (cause) {
      setError('root', { message: errorMessage(cause) });
    }
  };
  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <p className="muted">
        Enter the final score. The winning team and rankings update automatically.
      </p>
      <div className="result-form-grid">
        <div>
          <Avatar name={match.players[0].name} id={match.players[0]._id} large />
          <h3>{names[0]}</h3>
          <Field label="Team A score" error={errors.teamOneScore?.message}>
            <Input
              type="number"
              min={0}
              max={99}
              {...register('teamOneScore', { valueAsNumber: true })}
            />
          </Field>
        </div>
        <span>VS</span>
        <div>
          <Avatar name={match.players.at(-1)!.name} id={match.players.at(-1)!._id} large />
          <h3>{names[1]}</h3>
          <Field label="Team B score" error={errors.teamTwoScore?.message}>
            <Input
              type="number"
              min={0}
              max={99}
              {...register('teamTwoScore', { valueAsNumber: true })}
            />
          </Field>
        </div>
      </div>
      <FormError message={errors.root?.message} />
      <FormActions busy={isSubmitting} onCancel={onCancel} label="Save Result" />
    </form>
  );
}
export function JoinQueueForm({
  courtId,
  players,
  onDone,
  onCancel,
}: {
  courtId: string;
  players: Player[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<JoinQueueValues>({
    resolver: zodResolver(joinQueueSchema),
    defaultValues: { courtId },
  });
  const submit = async (values: JoinQueueValues) => {
    try {
      await api.post('/queue-entries', values);
      toast('Player joined the queue successfully.');
      onDone();
    } catch (cause) {
      setError('root', { message: errorMessage(cause) });
    }
  };
  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <input type="hidden" {...register('courtId')} />
      <p className="muted">Your place is assigned by the time you join.</p>
      <Field label="Player" error={errors.playerId?.message}>
        <Select {...register('playerId')}>
          <option value="">Choose a player</option>
          {players
            .filter((player) => player.isActive)
            .map((player) => (
              <option key={player._id} value={player._id}>
                {player.name}
              </option>
            ))}
        </Select>
      </Field>
      <FormError message={errors.root?.message} />
      <FormActions busy={isSubmitting} onCancel={onCancel} label="Join Queue" />
    </form>
  );
}
