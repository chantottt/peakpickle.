export const toMinutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
export function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.BUSINESS_TIMEZONE || 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
export function localDate(value: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.BUSINESS_TIMEZONE || 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}
export function localHour(value: Date) {
  return Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: process.env.BUSINESS_TIMEZONE || 'Asia/Manila',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(value),
  );
}
export const overlaps = (start: string, end: string, existingStart: string, existingEnd: string) =>
  start < existingEnd && end > existingStart;
export function localTime(value: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: process.env.BUSINESS_TIMEZONE || 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(value);
}
export function nextFreeTime(
  openingTime: string,
  closingTime: string,
  reservations: { startTime: string; endTime: string }[],
  fromTime: string,
) {
  let candidate = fromTime > openingTime ? fromTime : openingTime;
  for (const row of reservations)
    if (row.startTime <= candidate && row.endTime > candidate) candidate = row.endTime;
  if (candidate < closingTime) return `${today()}T${candidate}:00+08:00`;
  const nextDay = new Date(today() + 'T12:00:00Z');
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return `${nextDay.toISOString().slice(0, 10)}T${openingTime}:00+08:00`;
}
