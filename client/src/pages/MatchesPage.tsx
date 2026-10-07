import { useAuth } from '../auth';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useMutation } from '../hooks/useMutation';
import { api } from '../services/api';
import type { Match } from '../types';
import {
  PageHeader,
  Button,
  SearchBar,
  FilterSelect,
  DataState,
  EmptyState,
  Modal,
  Pagination,
} from '../components/ui';
import { MatchForm, ResultForm } from '../components/ui/EntityForms';
import { MatchCard } from '../components/matches/MatchCard';
import { capitalize, queryString } from '../utils/format';
export function MatchesPage() {
  const pageSize = 9;
  const { account } = useAuth();
  const admin = account?.role === 'admin';
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [playType, setPlay] = useState('');
  const [page, setPage] = useState(1);
  const [create, setCreate] = useState(false);
  const [result, setResult] = useState<Match | null>(null);
  const mutation = useMutation();
  const state = useApi<Match[]>(
    `/matches?${queryString({ search, status, playType, page: String(page), pageSize: String(pageSize) })}`,
  );
  const visibleMatches = state.data || [];
  useEffect(() => {
    if (!state.loading && state.data?.length === 0 && page > 1) setPage(page - 1);
  }, [state.loading, state.data, page]);
  return (
    <>
      <PageHeader
        title="Matches"
        description="Every rally has a story. Keep track of yours."
        action={
          admin && (
            <Button onClick={() => setCreate(true)}>
              <Plus size={17} />
              New Match
            </Button>
          )
        }
      />
      <div className="filters">
        <SearchBar
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search players or courts…"
        />
        <FilterSelect
          label="All Status"
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={['scheduled', 'ongoing', 'completed', 'cancelled'].map((value) => ({
            value,
            label: capitalize(value),
          }))}
        />
        <FilterSelect
          label="All Play Types"
          value={playType}
          onChange={(value) => {
            setPlay(value);
            setPage(1);
          }}
          options={['singles', 'doubles'].map((value) => ({ value, label: capitalize(value) }))}
        />
      </div>
      <DataState {...state} hasData={!!state.data} onRetry={state.refetch}>
        <div className="match-list">
          {visibleMatches.map((match) => (
            <MatchCard
              key={match._id}
              match={match}
              busy={mutation.busy}
              onStart={
                admin
                  ? () =>
                      mutation.run(
                        () => api.patch(`/matches/${match._id}`, { status: 'ongoing' }),
                        'Match started successfully.',
                        () => void state.refetch(),
                      )
                  : undefined
              }
              onResult={admin ? () => setResult(match) : undefined}
            />
          ))}
        </div>
        <Pagination page={page} hasNext={state.hasNext} onChange={setPage} />
        {state.data?.length === 0 && (
          <EmptyState
            title="No matches found"
            description="Try a different filter or schedule your next match."
            action={admin && <Button onClick={() => setCreate(true)}>New Match</Button>}
          />
        )}
      </DataState>
      {create && (
        <Modal title="New Match" wide onClose={() => setCreate(false)}>
          <MatchForm
            onCancel={() => setCreate(false)}
            onDone={() => {
              setCreate(false);
              void state.refetch();
            }}
          />
        </Modal>
      )}
      {result && (
        <Modal title="Record Match Result" onClose={() => setResult(null)}>
          <ResultForm
            match={result}
            onCancel={() => setResult(null)}
            onDone={() => {
              setResult(null);
              void state.refetch();
            }}
          />
        </Modal>
      )}
    </>
  );
}
