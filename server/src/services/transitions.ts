import { assert } from '../utils/errors.js';
const rules: Record<string, Record<string, string[]>> = {
  reservation: {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  },
  queue: {
    waiting: ['called', 'cancelled'],
    called: ['playing', 'skipped'],
    playing: ['completed'],
    completed: [],
    cancelled: [],
    skipped: [],
  },
  match: {
    scheduled: ['ongoing', 'cancelled'],
    ongoing: ['completed'],
    completed: [],
    cancelled: [],
  },
};
export function transition(resource: string, current: string, next: string) {
  if (current === next) return;
  assert(
    rules[resource]?.[current]?.includes(next),
    `Invalid ${resource} transition: ${current} -> ${next}.`,
  );
}
