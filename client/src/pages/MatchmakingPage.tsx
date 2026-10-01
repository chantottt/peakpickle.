import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import type { Player } from '../types';
import {
  Avatar,
  Badge,
  Button,
  Card,
  DataState,
  EmptyState,
  Field,
  PageHeader,
  Select,
} from '../components/ui';
import { capitalize, queryString } from '../utils/format';
export function MatchmakingPage() {
  const [params] = useSearchParams();
  const [skillLevel, setSkill] = useState(params.get('skill') || 'intermediate');
  const [playType, setPlay] = useState(params.get('play') || 'doubles');
  const [availableTime, setTime] = useState('evening');
  const [submitted, setSubmitted] = useState({
    skillLevel,
    playType,
    availableTime,
    excludePlayerId: params.get('player') || '',
  });
  const state = useApi<Player[]>(`/players/matches?${queryString(submitted)}`);
  return (
    <>
      <PageHeader
        eyebrow="A BETTER GAME STARTS WITH A GOOD MATCH"
        title="Find Your Match"
        description="Find players who share your level, schedule, and love of the game."
      />
      <Card className="matchmaking-form">
        <form
          className="matchmaking-filters"
          onSubmit={(event) => {
            event.preventDefault();
            const next = {
              skillLevel,
              playType,
              availableTime,
              excludePlayerId: params.get('player') || '',
            };
            if (queryString(next) === queryString(submitted)) void state.refetch();
            else setSubmitted(next);
          }}
        >
          <Field label="Skill Level">
            <Select value={skillLevel} onChange={(event) => setSkill(event.target.value)}>
              {['beginner', 'intermediate', 'advanced'].map((value) => (
                <option key={value} value={value}>
                  {capitalize(value)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Play Type">
            <Select value={playType} onChange={(event) => setPlay(event.target.value)}>
              {['singles', 'doubles', 'both'].map((value) => (
                <option key={value} value={value}>
                  {capitalize(value)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Available Time">
            <Select value={availableTime} onChange={(event) => setTime(event.target.value)}>
              {['morning', 'afternoon', 'evening', 'any'].map((value) => (
                <option key={value} value={value}>
                  {capitalize(value)}
                </option>
              ))}
            </Select>
          </Field>
          <Button busy={state.loading} type="submit">
            <Search size={17} />
            Find Players
          </Button>
        </form>
      </Card>
      <div className="panel-heading">
        <h2>Your matching players</h2>
        <span className="muted" style={{ fontSize: 12 }}>
          Highest compatibility first
        </span>
      </div>
      <DataState {...state} hasData={!!state.data} onRetry={state.refetch}>
        <div className="matching-list">
          {state.data?.map((player) => (
            <Card className="matching-row" key={player._id}>
              <Avatar name={player.name} id={player._id} large />
              <div>
                <h3>{player.name}</h3>
                <Badge tone={`skill-${player.skillLevel}`}>{capitalize(player.skillLevel)}</Badge>
                <p className="muted" style={{ marginTop: 6 }}>
                  {capitalize(player.preferredPlay)} · {player.winRate}% win rate
                </p>
              </div>
              <div className="matching-reason">
                <strong>{player.availability.map(capitalize).join(' / ')}</strong>
                {player.matchingReason}
              </div>
              <span
                className="matching-score"
                aria-label={`${player.matchPercentage} percent match`}
              >
                {player.matchPercentage}%
              </span>
              <Link to={`/players/${player._id}`} className="button button-secondary">
                View Profile
              </Link>
            </Card>
          ))}
        </div>
        {state.data?.length === 0 && (
          <EmptyState
            title="No active players yet"
            description="Add players and their availability to find a match."
          />
        )}
      </DataState>
      <p className="table-footnote">
        Skill level 60% · Compatible availability 30% · Same play preference 10%
      </p>
    </>
  );
}
