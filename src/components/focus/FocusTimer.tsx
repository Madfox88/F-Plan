/**
 * FocusTimer — Ring + Glow (V5 Purple → Blue)
 *
 * SVG progress ring with radial glow backdrop and gradient digits.
 * Two sizes: "lg" (Dashboard card / modal) and "sm" (compact).
 * Ring fills based on elapsed / planned ratio. Glow pulses when active.
 */

import './FocusTimer.css';

interface FocusTimerProps {
  /** Elapsed seconds to display */
  seconds: number;
  /** Whether the session is currently running — controls glow + ring */
  active?: boolean;
  /** Visual size — lg (default) for card/modal, sm for compact contexts */
  size?: 'lg' | 'sm';
  /** Planned duration in minutes — when set, shows remaining time + ring progress */
  plannedMinutes?: number | null;
}

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const R = 62; // ring radius
const C = 2 * Math.PI * R; // ≈ 389.56 circumference

export function FocusTimer({ seconds, active = false, size = 'lg', plannedMinutes }: FocusTimerProps) {
  const targetSeconds = plannedMinutes ? plannedMinutes * 60 : null;
  const remaining = targetSeconds ? Math.max(0, targetSeconds - seconds) : null;
  const overtime = targetSeconds ? seconds > targetSeconds : false;

  // Ring fill: 0-100% based on elapsed / planned; 100% if no plan or overtime
  const progress = targetSeconds
    ? Math.min(seconds / targetSeconds, 1)
    : active ? 1 : 0;
  const offset = C * (1 - progress);

  return (
    <div className={`focus-ring-timer focus-ring-timer--${size}${active ? ' focus-ring-timer--active' : ''}${overtime ? ' focus-ring-timer--overtime' : ''}`}>
      {/* Radial glow behind the ring */}
      <div className="focus-ring-timer__glow" aria-hidden="true" />

      {/* SVG ring */}
      <svg className="focus-ring-timer__svg" viewBox="0 0 150 150">
        <defs>
          <linearGradient id="focusRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--focus-ring-start)" />
            <stop offset="100%" stopColor="var(--focus-ring-end)" />
          </linearGradient>
        </defs>
        <circle className="focus-ring-timer__track" cx="75" cy="75" r={R} />
        {active && (
          <circle
            className="focus-ring-timer__progress"
            cx="75" cy="75" r={R}
            strokeDasharray={C}
            strokeDashoffset={offset}
            transform="rotate(-90 75 75)"
          />
        )}
      </svg>

      {/* Center content */}
      <div className="focus-ring-timer__center">
        <span className="focus-ring-timer__digits">{formatTime(seconds)}</span>
        {active && remaining !== null ? (
          <span className="focus-ring-timer__sub">
            {overtime ? 'Overtime' : `${formatTime(remaining)} left`}
          </span>
        ) : !active ? (
          <span className="focus-ring-timer__sub">Ready</span>
        ) : null}
      </div>
    </div>
  );
}
