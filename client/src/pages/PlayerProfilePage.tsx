import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, Swords, Trophy, TrendingUp, Activity } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useMutation } from '../hooks/useMutation';
import { api } from '../services/api';
import type { Player } from '../types';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataState,
  EmptyState,
  Modal,
  StatCard,
  Table,
} from '../components/ui';
import { PlayerForm } from '../components/ui/EntityForms';
import { capitalize, dateLabel } from '../utils/format';
export function PlayerProfilePage() {
  const { id } = useParams();
  const state = useApi<Player>(`/players/${id}`);
  const navigate = useNavigate();
  const mutation = useMutation();
  const [edit, setEdit] = useState(false);
  const [remove, setRemove] = useState(false);
  const player = state.data;
  return (
    <>
      <Link className="back-link" to="/players">
        <ArrowLeft size={15} />
        Back to Players
      </Link>
      <DataState {...state} hasData={!!player} onRetry={state.refetch}>
        {player && (
          <>
            <Card className="profile-card">
              <div className="profile-banner" />
              <div className="profile-heading">
                <Avatar name={player.name} id={player._id} large />
                <div>
                  <h1>{player.name}</h1>
                  <Badge tone={`skill-${player.skillLevel}`}>{capitalize(player.skillLevel)}</Badge>
                  <Badge>{capitalize(player.preferredPlay)}</Badge>
                  {!player.isActive && <Badge tone="status-cancelled">Inactive</Badge>}
                  <p>{player.email}</p>
                </div>
                <div className="profile-actions">
                  <Button variant="secondary" onClick={() => setEdit(true)}>
                    <Pencil size={15} />
                    Edit Profile
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label="Delete player"
                    onClick={() => setRemove(true)}
                  >
                    <Trash2 size={17} />
                  </Button>
                </div>
              </div>
            </Card>
            <div className="stats-grid">
              <StatCard
                label="Matches Played"
                value={player.matchesPlayed}
                icon={<Swords size={20} />}
                note="Completed matches"
              />
              <StatCard
                label="Wins"
                value={player.wins}
                icon={<Trophy size={20} />}
                note="Games won"
              />
              <StatCard
                label="Losses"
                value={player.losses}
                icon={<Activity size={20} />}
                note="Always another game"
              />
              <StatCard
                label="Win Rate"
                value={`${player.winRate}%`}
                icon={<TrendingUp size={20} />}
                note={`Club rank #${player.rank}`}
              />
            </div>
            <div className="profile-grid">
              <Card className="panel">
                <div className="panel-heading">
                  <h2>Recent Matches</h2>
                  <Link className="text-link" to="/matches">
                    All matches
                  </Link>
                </div>
                {player.recentMatches?.length ? (
                  <Table headers={['Date', 'Opponent', 'Score', 'Result']}>
                    <>
                      {player.recentMatches.slice(0, 10).map((match) => {
                        const half = match.players.length / 2;
                        const myIndex = match.players.findIndex(
                          (person) => person._id === player._id,
                        );
                        const opponents = (
                          myIndex < half ? match.players.slice(half) : match.players.slice(0, half)
                        )
                          .map((person) => person.name)
                          .join(' & ');
                        const win = match.result?.winnerPlayerIds.includes(player._id);
                        return (
                          <tr key={match._id}>
                            <td data-label="Date">
                              <Link to={`/matches/${match._id}`}>
                                {dateLabel(match.scheduledAt, { year: undefined })}
                              </Link>
                            </td>
                            <td data-label="Opponent">{opponents}</td>
                            <td data-label="Score">
                              {match.result
                                ? `${match.result.teamOneScore} – ${match.result.teamTwoScore}`
                                : '—'}
                            </td>
                            <td data-label="Result">
                              <Badge
                                tone={
                                  match.result
                                    ? win
                                      ? 'status-available'
                                      : 'status-cancelled'
                                    : 'status-scheduled'
                                }
                              >
                                {match.result ? (win ? 'Win' : 'Loss') : capitalize(match.status)}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  </Table>
                ) : (
                  <EmptyState
                    title="A fresh start"
                    description="Matches will appear here after this player joins a game."
                  />
                )}
              </Card>
              <Card className="panel">
                <div className="panel-heading">
                  <h2>Playing preferences</h2>
                </div>
                <div className="profile-preferences">
                  <div>
                    <span>Skill level</span>
                    <strong>{capitalize(player.skillLevel)}</strong>
                  </div>
                  <div>
                    <span>Preferred play</span>
                    <strong>{capitalize(player.preferredPlay)}</strong>
                  </div>
                  <div>
                    <span>Available times</span>
                    <div className="availability-tags">
                      {player.availability.map((slot) => (
                        <Badge key={slot}>{capitalize(slot)}</Badge>
                      ))}
                    </div>
                  </div>
                  <Link
                    to={`/matchmaking?skill=${player.skillLevel}&play=${player.preferredPlay}&player=${player._id}`}
                    className="button button-primary"
                  >
                    Find a Match
                  </Link>
                  <Link
                    to={`/reservations/new?player=${player._id}`}
                    className="button button-secondary"
                  >
                    Reserve a Court
                  </Link>
                </div>
              </Card>
            </div>
            {edit && (
              <Modal title="Edit Player" onClose={() => setEdit(false)}>
                <PlayerForm
                  player={player}
                  onCancel={() => setEdit(false)}
                  onDone={() => {
                    setEdit(false);
                    void state.refetch();
                  }}
                />
              </Modal>
            )}
            {remove && (
              <ConfirmDialog
                title="Delete Player?"
                busy={mutation.busy}
                onClose={() => setRemove(false)}
                onConfirm={() =>
                  mutation.run(
                    () => api.delete(`/players/${player._id}`),
                    'Player deleted successfully.',
                    () => navigate('/players'),
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
