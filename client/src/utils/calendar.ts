import type { Match, Reservation } from '../types';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  location: string;
  description: string;
}
const escapeText = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n|\r/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
const timestamp = (value: string) =>
  new Date(value)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
// RFC 5545 lines are folded at 75 UTF-8 octets, without splitting a character.
function fold(line: string) {
  const encoder = new TextEncoder();
  let result = '',
    width = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
    if (width + size > 75) {
      result += '\r\n ';
      width = 1;
    }
    result += character;
    width += size;
  }
  return result;
}
export function calendarText(event: CalendarEvent) {
  return (
    [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//PeakPickle//Club Calendar//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${escapeText(event.id)}@peakpickle`,
      `DTSTAMP:${timestamp(new Date().toISOString())}`,
      `DTSTART:${timestamp(event.start)}`,
      ...(event.end ? [`DTEND:${timestamp(event.end)}`] : []),
      `SUMMARY:${escapeText(event.title)}`,
      `LOCATION:${escapeText(event.location)}`,
      `DESCRIPTION:${escapeText(event.description)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ]
      .map(fold)
      .join('\r\n') + '\r\n'
  );
}
export function reservationEvent(row: Reservation): CalendarEvent {
  return {
    id: `reservation-${row._id}`,
    title: `Pickleball reservation · ${row.courtId.name}`,
    start: `${row.reservationDate}T${row.startTime}:00+08:00`,
    end: `${row.reservationDate}T${row.endTime}:00+08:00`,
    location: `${row.courtId.name}, ${row.courtId.location}`,
    description: `Player: ${row.playerId.name}\nStatus: ${row.status}\nTimes shown in Asia/Manila. Check PeakPickle for booking changes.`,
  };
}
export function matchEvent(row: Match): CalendarEvent {
  return {
    id: `match-${row._id}`,
    title: `Pickleball ${row.playType} · ${row.courtId.name}`,
    start: row.scheduledAt,
    location: `${row.courtId.name}, ${row.courtId.location}`,
    description: `${row.players.map((player) => player.name).join(' / ')}\nEnd time is not set. Check PeakPickle for schedule changes.`,
  };
}
export function downloadCalendar(event: CalendarEvent) {
  const url = URL.createObjectURL(
    new Blob([calendarText(event)], { type: 'text/calendar;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `peakpickle-${event.id}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
