import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Play, Trophy, Trash2 } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useMutation } from '../hooks/useMutation';
import { api } from '../services/api';
import type { Match } from '../types';
import {
  Avatar,
  Button,
  Card,
  ConfirmDialog,
  DataState,
  Modal,
  PageHeader,
  StatusBadge,
} from '../components/ui';
import { MatchForm, ResultForm } from '../components/ui/EntityForms';
import { capitalize, dateLabel, timeLabel, teamNames } from '../utils/format';
export function MatchDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const state = useApi<Match>(`/matches/${id}`);
  const mutation = useMutation();
  const [edit, setEdit] = useState(false);
  const [result, setResult] = useState(false);
  const [remove, setRemove] = useState(false);
  const [cancel, setCancel] = useState(false);
  const match = state.data;
  const names = match ? teamNames(match) : [];
  const done = () => {
    setEdit(false);
    setResult(false);
    void state.refetch();
  };
  return (
    <>
      <Link to="/matches" className="back-link">
        <ArrowLeft size={15} />
        Back to Matches
      </Link>
      <PageHeader
        title="Match Details"
        description="The score, the players, and every detail of the game."
      />
      <DataState {...state} hasData={!!match} onRetry={state.refetch}>
        {match && (
          <>
            <div className="detail-heading">
              <StatusBadge status={match.status} />
              <div className="page-actions">
                {match.status === 'scheduled' && (
                  <>
                    <Button variant="secondary" onClick={() => setEdit(true)}>
                      <Pencil size={15} />
                      Edit Match
                    </Button>
                    <Button
                      busy={mutation.busy}
                      onClick={() =>
                        mutation.run(
                          () => api.patch(`/matches/${match._id}`, { status: 'ongoing' }),
                          'Match started successfully.',
                          () => void state.refetch(),
                        )
                      }
                    >
                      <Play size={15} />
                      Start Match
                    </Button>
                    <Button variant="ghost" onClick={() => setCancel(true)}>
                      Cancel Match
                    </Button>
                  </>
                )}
                {match.status === 'ongoing' && (
                  <Button onClick={() => setResult(true)}>Record Result</Button>
                )}
                {match.status !== 'ongoing' && (
                  <Button variant="ghost" aria-label="Delete match" onClick={() => setRemove(true)}>
                    <Trash2 size={17} />
                  </Button>
                )}
              </div>
            </div>
            <Card className="scorecard">
              <div className="scorecard-top">
                {capitalize(match.playType)} · {match.courtId.name} · {dateLabel(match.scheduledAt)}
              </div>
              <div className="scorecard-teams">
                <div className="scorecard-team">
                  <div className="avatar-group">
                    {match.players.slice(0, match.players.length / 2).map((player) => (
                      <Avatar key={player._id} name={player.name} id={player._id} large />
                    ))}
                  </div>
                  <h2>{names[0]}</h2>
                  <strong>{match.result?.teamOneScore ?? '—'}</strong>
                  <span className="muted">TEAM A</span>
                </div>
                <span className="scorecard-vs">VS</span>
                <div className="scorecard-team">
                  <div className="avatar-group">
                    {match.players.slice(match.players.length / 2).map((player) => (
                      <Avatar key={player._id} name={player.name} id={player._id} large />
                    ))}
                  </div>
                  <h2>{names[1]}</h2>
                  <strong>{match.result?.teamTwoScore ?? '—'}</strong>
                  <span className="muted">TEAM B</span>
                </div>
              </div>
            </Card>
            {match.result && (
              <div className="winner-strip">
                <Trophy size={20} />
                <strong>
                  Winner:{' '}
                  {match.players
                    .filter((player) => match.result!.winnerPlayerIds.includes(player._id))
                    .map((player) => player.name)
                    .join(' & ')}
                </strong>
              </div>
            )}
            <Card>
              <dl className="match-info-grid">
                <div>
                  <dt>Court</dt>
                  <dd>
                    <Link to={`/courts/${match.courtId._id}`}>{match.courtId.name}</Link>
                  </dd>
                </div>
                <div>
                  <dt>Play type</dt>
                  <dd>{capitalize(match.playType)}</dd>
                </div>
                <div>
                  <dt>Started at</dt>
                  <dd>
                    {match.startedAt
                      ? `${dateLabel(match.startedAt, { year: undefined })} · ${timeLabel(match.startedAt)}`
                      : 'Not started'}
                  </dd>
                </div>
                <div>
                  <dt>Completed at</dt>
                  <dd>
                    {match.completedAt
                      ? `${dateLabel(match.completedAt, { year: undefined })} · ${timeLabel(match.completedAt)}`
                      : 'Not completed'}
                  </dd>
                </div>
              </dl>
            </Card>
            {edit && (
              <Modal title="Edit Match" wide onClose={() => setEdit(false)}>
                <MatchForm match={match} onCancel={() => setEdit(false)} onDone={done} />
              </Modal>
            )}
            {result && (
              <Modal title="Record Match Result" onClose={() => setResult(false)}>
                <ResultForm match={match} onCancel={() => setResult(false)} onDone={done} />
              </Modal>
            )}
            {remove && (
              <ConfirmDialog
                title="Delete Match?"
                busy={mutation.busy}
                onClose={() => setRemove(false)}
                onConfirm={() =>
                  mutation.run(
                    () => api.delete(`/matches/${match._id}`),
                    'Match deleted successfully.',
                    () => navigate('/matches'),
                  )
                }
              />
            )}
            {cancel && (
              <Modal title="Cancel Match?" onClose={() => setCancel(false)}>
                <p className="muted">
                  This scheduled match will be cancelled. Schedule a new match if you want to play
                  another time.
                </p>
                <div className="form-actions">
                  <Button
                    variant="secondary"
                    disabled={mutation.busy}
                    onClick={() => setCancel(false)}
                  >
                    Keep Match
                  </Button>
                  <Button
                    variant="danger"
                    busy={mutation.busy}
                    onClick={() =>
                      mutation.run(
                        () => api.patch(`/matches/${match._id}`, { status: 'cancelled' }),
                        'Match cancelled successfully.',
                        () => {
                          setCancel(false);
                          void state.refetch();
                        },
                      )
                    }
                  >
                    Cancel Match
                  </Button>
                </div>
              </Modal>
            )}
          </>
        )}
      </DataState>
    </>
  );
}
