import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import type { Court } from '../types';
import {
  PageHeader,
  Button,
  SearchBar,
  FilterSelect,
  DataState,
  EmptyState,
  Modal,
} from '../components/ui';
import { CourtForm } from '../components/ui/EntityForms';
import { CourtCard } from '../components/courts/CourtCard';
import { queryString, capitalize } from '../utils/format';
export function CourtsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [create, setCreate] = useState(false);
  const state = useApi<Court[]>(`/courts?${queryString({ search, status, type })}`);
  return (
    <>
      <PageHeader
        title="Courts"
        description="Manage and monitor pickleball courts."
        action={
          <Button onClick={() => setCreate(true)}>
            <Plus size={17} />
            Add Court
          </Button>
        }
      />
      <div className="filters">
        <SearchBar placeholder="Search courts or locations…" value={search} onChange={setSearch} />
        <FilterSelect
          label="All Status"
          value={status}
          onChange={setStatus}
          options={['available', 'occupied', 'maintenance'].map((value) => ({
            value,
            label: capitalize(value),
          }))}
        />
        <FilterSelect
          label="All Types"
          value={type}
          onChange={setType}
          options={['indoor', 'outdoor'].map((value) => ({ value, label: capitalize(value) }))}
        />
      </div>
      <DataState {...state} hasData={!!state.data} onRetry={state.refetch}>
        <div className="court-grid">
          {state.data?.map((court) => (
            <CourtCard key={court._id} court={court} />
          ))}
        </div>
        {state.data?.length === 0 && (
          <EmptyState
            title="No courts found"
            description="Try a different search or add your first court."
            action={<Button onClick={() => setCreate(true)}>Add Court</Button>}
          />
        )}
      </DataState>
      {create && (
        <Modal title="Add Court" onClose={() => setCreate(false)}>
          <CourtForm
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
