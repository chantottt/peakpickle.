import { CalendarPlus } from 'lucide-react';
import { Button } from './index';
import { downloadCalendar, type CalendarEvent } from '../../utils/calendar';
export function CalendarButton({ event }: { event: CalendarEvent }) {
  return (
    <Button
      variant="secondary"
      onClick={() => downloadCalendar(event)}
      title="Download a calendar event (.ics)"
    >
      <CalendarPlus size={15} />
      Add to calendar
    </Button>
  );
}
