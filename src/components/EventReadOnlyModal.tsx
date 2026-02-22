import type { CalendarEvent } from '../types/database';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface EventReadOnlyModalProps {
  isOpen: boolean;
  event: CalendarEvent & { occurrenceStart: string; occurrenceEnd: string };
  onClose: () => void;
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function EventReadOnlyModal({ isOpen, event, onClose }: EventReadOnlyModalProps) {
  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content glass" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{event.title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Starts:</span>{' '}
            <span>{fmtDateTime(event.occurrenceStart)}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Ends:</span>{' '}
            <span>{fmtDateTime(event.occurrenceEnd)}</span>
          </div>
          {event.location && (
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Location:</span>{' '}
              <span>{event.location}</span>
            </div>
          )}
          {event.notes && (
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Notes:</span>
              <p style={{ margin: 'var(--space-xs) 0 0', whiteSpace: 'pre-wrap' }}>{event.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
