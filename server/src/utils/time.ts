// Business clock is injectable in regression tests without changing MongoDB driver/session clocks.
export const clock = { now: () => new Date() };
export const currentTime = () => clock.now();
export const toMinutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
export function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.BUSINESS_TIMEZONE || 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(currentTime());
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
  reservations: { reservationDate: string; startTime: string; endTime: string }[],
  fromTime: string,
  fromDate = today(),
) {
  let date = fromDate;
  let candidate = fromTime > openingTime ? fromTime : openingTime;
  const sorted = [...reservations].sort((a, b) => a.startTime.localeCompare(b.startTime));
  for (;;) {
    for (const row of sorted)
      if (row.reservationDate === date && row.startTime <= candidate && row.endTime > candidate)
        candidate = row.endTime;
    if (candidate < closingTime) return `${date}T${candidate}:00+08:00`;
    const nextDay = new Date(date + 'T12:00:00Z');
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    date = nextDay.toISOString().slice(0, 10);
    candidate = openingTime;
  }
}
