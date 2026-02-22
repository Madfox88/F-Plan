/**
 * ReminderModal — Create / Edit a Reminder (CALENDAR_RULES.md §8.2)
 *
 * Required fields: Title, Datetime, Repeat rule
 * Optional fields: Notes
 * Uses universal popup system (ModalBase.css)
 */

import React, { useState, useEffect } from 'react';
import type { Reminder, RepeatRule } from '../../types/database';
import { useEscapeKey } from '../../hooks/useEscapeKey';

const REPEAT_OPTIONS: { value: RepeatRule; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'daily', label: 'Daily' },
  { value: 'bi_daily', label: 'Every 2 days' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi_weekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'bi_monthly', label: 'Every 2 months' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'bi_yearly', label: 'Every 2 years' },
];

function toLocalDatetimeString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface ReminderModalProps {
  isOpen: boolean;
  reminder?: Reminder;
  defaultAt?: Date;
  onClose: () => void;
  onSave: (data: {
    title: string;
    notes?: string;
    remindAt: string;
    repeatRule: RepeatRule;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function ReminderModal({ isOpen, reminder, defaultAt, onClose, onSave, onDelete }: ReminderModalProps) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [repeatRule, setRepeatRule] = useState<RepeatRule>('none');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (reminder) {
      setTitle(reminder.title);
      setNotes(reminder.notes || '');
      setRemindAt(toLocalDatetimeString(new Date(reminder.remind_at)));
      setRepeatRule(reminder.repeat_rule);
    } else {
      const at = defaultAt || new Date();
      setTitle('');
      setNotes('');
      setRemindAt(toLocalDatetimeString(at));
      setRepeatRule('none');
    }
    setError(null);
  }, [reminder, defaultAt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    if (!remindAt) { setError('Date and time are required'); return; }

    try {
      setLoading(true);
      setError(null);
      await onSave({
        title: title.trim(),
        notes: notes.trim() || undefined,
        remindAt: new Date(remindAt).toISOString(),
        repeatRule,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save reminder');
    } finally {
      setLoading(false);
    }
  };

  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h2>{reminder ? 'Edit Reminder' : 'Create Reminder'}</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6L18 18" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Reminder title"
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Date & Time *</label>
            <input
              type="datetime-local"
              value={remindAt}
              onChange={(e) => setRemindAt(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Repeat</label>
            <select
              className="form-input"
              value={repeatRule}
              onChange={(e) => setRepeatRule(e.target.value as RepeatRule)}
              disabled={loading}
            >
              {REPEAT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-footer">
            {onDelete && (
              <button
                type="button"
                className="btn-secondary"
                style={{ marginRight: 'auto', color: 'var(--color-error)' }}
                onClick={onDelete}
                disabled={loading}
              >
                <span>Delete</span>
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              <span>Cancel</span>
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              <span>{loading ? 'Saving...' : reminder ? 'Save Changes' : 'Create Reminder'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
