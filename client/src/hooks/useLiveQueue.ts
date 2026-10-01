import { useEffect } from 'react';
import type { QueueSummary } from '../types';
import { useApi } from './useApi';
export function useLiveQueue(courtId?: string) {
  const state = useApi<QueueSummary[]>(
    courtId ? `/queue-entries/summary?courtId=${courtId}` : '/queue-entries/summary',
  );
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void state.refetch();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [state.refetch]);
  return state;
}
