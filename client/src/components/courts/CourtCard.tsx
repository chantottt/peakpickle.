import { Link } from 'react-router-dom';
import { MapPin, Clock3, Users } from 'lucide-react';
import type { Court } from '../../types';
import { StatusBadge } from '../ui';
import { timeLabel, dateLabel } from '../../utils/format';
export function CourtCard({ court }: { court: Court }) {
  return (
    <article className="card court-card">
      <Link to={`/courts/${court._id}`} className="court-image">
        <img
          src="/pickleball-courts.jpg"
          alt={`${court.name} pickleball court`}
          style={{ objectPosition: court.courtNumber % 2 ? '35% center' : '75% center' }}
          loading="lazy"
        />
        <StatusBadge status={court.status} />
        <span className="court-number">COURT {String(court.courtNumber).padStart(2, '0')}</span>
      </Link>
      <div className="court-card-body">
        <div className="court-title">
          <Link to={`/courts/${court._id}`}>
            <h3>{court.name}</h3>
          </Link>
          <span className="type-label">{court.type}</span>
        </div>
        <p className="court-meta">
          <MapPin size={14} />
          {court.location}
        </p>
        <div className="court-details">
          <span>
            <Clock3 size={15} />
            {timeLabel(court.openingTime)} – {timeLabel(court.closingTime)}
          </span>
          <span>
            <Users size={15} />
            {court.queueCount || 0} in queue
          </span>
        </div>
        <div className="court-next">
          <span>Next available (estimated)</span>
          <strong>
            {court.nextAvailableTime
              ? timeLabel(court.nextAvailableTime)
              : court.status === 'maintenance'
                ? 'Temporarily closed'
                : 'Check the schedule'}
          </strong>
          <span style={{ marginTop: 8 }}>Next reservation</span>
          <strong>
            {court.nextSchedule
              ? `${dateLabel(court.nextSchedule.reservationDate, { year: undefined })} · ${timeLabel(court.nextSchedule.startTime)}`
              : court.status === 'maintenance'
                ? 'Temporarily closed'
                : 'Open for your next game'}
          </strong>
        </div>
        <div className="court-card-actions">
          <Link className="button button-secondary" to={`/courts/${court._id}`}>
            View
          </Link>
          {court.status !== 'maintenance' && (
            <Link
              className="button button-primary"
              to={
                court.status === 'occupied'
                  ? `/queue?court=${court._id}`
                  : `/reservations/new?court=${court._id}`
              }
            >
              {court.status === 'occupied' ? 'Join Queue' : 'Reserve'}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
