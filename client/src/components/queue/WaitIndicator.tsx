import { useEffect, useState } from 'react';
import { Clock3 } from 'lucide-react';
export function WaitIndicator({ joinedAt }: { joinedAt: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);
  const minutes = Math.max(0, Math.floor((now - new Date(joinedAt).getTime()) / 60000));
  const label =
    minutes < 1
      ? 'Less than 1 min'
      : minutes < 60
        ? `${minutes} min`
        : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return (
    <span className="wait-indicator" title="Time since joining the queue">
      <Clock3 size={14} />
      {label} waited
    </span>
  );
}
