/**
 * EventModal — Create / Edit an Event (CALENDAR_RULES.md §8.1)
 *
 * Required fields: Title, Start datetime, End datetime, Repeat rule
 * Optional fields: Notes, Location
 * Uses universal popup system (ModalBase.css)
 */

import React, { useState, useEffect } from 'react';
import type { CalendarEvent, RepeatRule } from '../types/database';
import { useEscapeKey } from '../hooks/useEscapeKey';

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

interface EventModalProps {
  isOpen: boolean;
  event?: CalendarEvent;
  defaultStart?: Date;
  onClose: () => void;
  onSave: (data: {
    title: string;
    notes?: string;
    location?: string;
    startAt: string;
    endAt: string;
    repeatRule: RepeatRule;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function EventModal({ isOpen, event, defaultStart, onClose, onSave, onDelete }: EventModalProps) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [repeatRule, setRepeatRule] = useState<RepeatRule>('none');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setNotes(event.notes || '');
      setLocation(event.location || '');
      setStartAt(toLocalDatetimeString(new Date(event.start_at)));
      setEndAt(toLocalDatetimeString(new Date(event.end_at)));
      setRepeatRule(event.repeat_rule);
    } else {
      const start = defaultStart || new Date();
      const end = new Date(start.getTime() + 60 * 60 * 1000); // +1 hour
      setTitle('');
      setNotes('');
      setLocation('');
      setStartAt(toLocalDatetimeString(start));
      setEndAt(toLocalDatetimeString(end));
      setRepeatRule('none');
    }
    setError(null);
  }, [event, defaultStart]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    if (!startAt || !endAt) { setError('Start and end times are required'); return; }
    if (new Date(startAt) >= new Date(endAt)) { setError('End time must be after start time'); return; }

    try {
      setLoading(true);
      setError(null);
      await onSave({
        title: title.trim(),
        notes: notes.trim() || undefined,
        location: location.trim() || undefined,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        repeatRule,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h2>{event ? 'Edit Event' : 'Create Event'}</h2>
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
              placeholder="Event title"
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Start *</label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">End *</label>
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Optional location"
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
              <span>{loading ? 'Saving...' : event ? 'Save Changes' : 'Create Event'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
