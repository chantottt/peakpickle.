export const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
export function dateLabel(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Manila',
    ...options,
  }).format(new Date(value.length === 10 ? value + 'T12:00:00+08:00' : value));
}
export function timeLabel(value: string) {
  if (!value) return '—';
  const date = new Date(value.length === 5 ? `2000-01-01T${value}:00+08:00` : value);
  return new Intl.DateTimeFormat('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Manila',
  }).format(date);
}
export const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join('');
export function queryString(values: Record<string, string>) {
  return new URLSearchParams(
    Object.fromEntries(Object.entries(values).filter(([, value]) => value !== '')),
  ).toString();
}
export function teamNames(match: { players: { name: string }[] }) {
  const half = match.players.length / 2;
  return [
    match.players
      .slice(0, half)
      .map((player) => player.name)
      .join(' & '),
    match.players
      .slice(half)
      .map((player) => player.name)
      .join(' & '),
  ];
}
