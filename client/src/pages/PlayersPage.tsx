import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import type { Player } from '../types';
import {
  PageHeader,
  Button,
  SearchBar,
  FilterSelect,
  DataState,
  EmptyState,
  Modal,
} from '../components/ui';
import { PlayerForm } from '../components/ui/EntityForms';
import { PlayerCard } from '../components/players/PlayerCard';
import { capitalize, queryString } from '../utils/format';
export function PlayersPage() {
  const [search, setSearch] = useState('');
  const [skillLevel, setSkill] = useState('');
  const [preferredPlay, setPlay] = useState('');
  const [create, setCreate] = useState(false);
  const state = useApi<Player[]>(`/players?${queryString({ search, skillLevel, preferredPlay })}`);
  return (
    <>
      <PageHeader
        title="Players"
        description="Good players. Great company. Find your community."
        action={
          <Button onClick={() => setCreate(true)}>
            <Plus size={17} />
            Add Player
          </Button>
        }
      />
      <div className="filters">
        <SearchBar placeholder="Search players…" value={search} onChange={setSearch} />
        <FilterSelect
          label="All Skill Levels"
          value={skillLevel}
          onChange={setSkill}
          options={['beginner', 'intermediate', 'advanced'].map((value) => ({
            value,
            label: capitalize(value),
          }))}
        />
        <FilterSelect
          label="All Play Types"
          value={preferredPlay}
          onChange={setPlay}
          options={['singles', 'doubles', 'both'].map((value) => ({
            value,
            label: capitalize(value),
          }))}
        />
      </div>
      <DataState {...state} hasData={!!state.data} onRetry={state.refetch}>
        <div className="player-grid">
          {state.data?.map((player) => (
            <PlayerCard key={player._id} player={player} />
          ))}
        </div>
        {state.data?.length === 0 && (
          <EmptyState
            title="No players found"
            description="Try another search, or welcome a new player."
            action={<Button onClick={() => setCreate(true)}>Add Player</Button>}
          />
        )}
      </DataState>
      {create && (
        <Modal title="Add Player" onClose={() => setCreate(false)}>
          <PlayerForm
            onCancel={() => setCreate(false)}
            onDone={() => {
              setCreate(false);
              void state.refetch();
            }}
          />
        </Modal>
      )}
    </>
  );
}
