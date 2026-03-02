import { useState, useRef, useEffect, useCallback } from 'react';
import './DatePicker.css';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface DatePickerProps {
  value: string;                   // YYYY-MM-DD or ''
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

/** Pad single-digit numbers with a leading zero. */
function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }

/** Format a Date to YYYY-MM-DD. */
function toISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Format YYYY-MM-DD to a friendly display string. */
function formatDisplay(iso: string) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function DatePicker({ value, onChange, label, placeholder = 'Pick a date', disabled = false }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Calendar view month
  const initial = value ? new Date(value + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  // Sync view when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const prevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) { setViewYear((y) => y - 1); return 11; }
      return m - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) { setViewYear((y) => y + 1); return 0; }
      return m + 1;
    });
  }, []);

  const selectDate = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    onChange(toISO(d));
    setOpen(false);
  };

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0-6
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const today = toISO(new Date());
  const selectedISO = value;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="dp" ref={ref}>
      {label && <span className="dp-label">{label}</span>}
      <button
        type="button"
        className="dp-trigger"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        <svg className="dp-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="4" width="16" height="14" rx="2" />
          <path d="M2 8h16" />
          <path d="M6 2v4M14 2v4" />
        </svg>
        <span className={value ? 'dp-trigger-text' : 'dp-trigger-text dp-trigger-placeholder'}>
          {value ? formatDisplay(value) : placeholder}
        </span>
      </button>

      {open && (
        <div className="dp-dropdown">
          {/* Header */}
          <div className="dp-header">
            <button type="button" className="dp-nav" onClick={prevMonth} aria-label="Previous month">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8l5 5" /></svg>
            </button>
            <span className="dp-month-label">{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" className="dp-nav" onClick={nextMonth} aria-label="Next month">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3l5 5-5 5" /></svg>
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="dp-grid dp-weekdays">
            {DAYS.map((d) => <span key={d} className="dp-weekday">{d}</span>)}
          </div>

          {/* Day cells */}
          <div className="dp-grid dp-days">
            {cells.map((day, i) => {
              if (day === null) return <span key={`e${i}`} className="dp-cell dp-empty" />;
              const iso = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
              const isToday = iso === today;
              const isSelected = iso === selectedISO;
              return (
                <button
                  key={day}
                  type="button"
                  className={[
                    'dp-cell',
                    isToday && 'dp-today',
                    isSelected && 'dp-selected',
                  ].filter(Boolean).join(' ')}
                  onClick={() => selectDate(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer — quick "Today" jump */}
          <div className="dp-footer">
            <button
              type="button"
              className="dp-today-btn"
              onClick={() => { onChange(today); setOpen(false); }}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
