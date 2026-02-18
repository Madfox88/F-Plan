/**
 * CalendarChooserModal — Clicking an empty date/time slot (CALENDAR_RULES.md §6.1)
 *
 * Opens a Create Chooser popup with exactly two options:
 * - Create Event
 * - Create Reminder
 *
 * No "Create Task" and no "Create Goal".
 * Uses universal popup system (ModalBase.css).
 */

import calendarIcon from '../assets/icons/calendar.svg';
import reminderIcon from '../assets/icons/reminder.svg';
import './CalendarChooserModal.css';

interface CalendarChooserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (choice: 'event' | 'reminder') => void;
}

export function CalendarChooserModal({ isOpen, onClose, onSelect }: CalendarChooserModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content calendar-chooser-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6L18 18" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="modal-body chooser-body">
          <button
            className="chooser-option"
            onClick={() => onSelect('event')}
          >
            <img src={calendarIcon} alt="" className="chooser-icon" />
            <div className="chooser-option-text">
              <span className="chooser-option-title">Event</span>
              <span className="chooser-option-desc">Create a time-blocked event</span>
            </div>
          </button>

          <button
            className="chooser-option"
            onClick={() => onSelect('reminder')}
          >
            <img src={reminderIcon} alt="" className="chooser-icon" />
            <div className="chooser-option-text">
              <span className="chooser-option-title">Reminder</span>
              <span className="chooser-option-desc">Set a reminder at a specific time</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
