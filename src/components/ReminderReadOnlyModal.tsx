import type { Reminder } from '../types/database';

interface ReminderReadOnlyModalProps {
  isOpen: boolean;
  reminder: Reminder & { occurrenceAt: string };
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

export function ReminderReadOnlyModal({ isOpen, reminder, onClose }: ReminderReadOnlyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content glass" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{reminder.title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Remind at:</span>{' '}
            <span>{fmtDateTime(reminder.occurrenceAt)}</span>
          </div>
          {reminder.notes && (
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Notes:</span>
              <p style={{ margin: 'var(--space-xs) 0 0', whiteSpace: 'pre-wrap' }}>{reminder.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
