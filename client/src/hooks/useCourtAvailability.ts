import type { Court } from '../types';
import { useApi } from './useApi';
export function useCourtAvailability(
  date: string,
  startTime: string,
  endTime: string,
  excludeReservationId?: string,
) {
  const valid =
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    /^\d{2}:\d{2}$/.test(startTime) &&
    /^\d{2}:\d{2}$/.test(endTime) &&
    startTime < endTime;
  const query = new URLSearchParams({
    date,
    startTime,
    endTime,
    ...(excludeReservationId ? { excludeReservationId } : {}),
  });
  return useApi<Court[]>(valid ? `/courts/availability?${query}` : null);
}
