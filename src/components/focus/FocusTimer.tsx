/**
 * FocusTimer — Variant C "Gradient Glow" countdown / elapsed display.
 *
 * Renders bold gradient-filled digits with a soft diffused glow behind them.
 * Two sizes:  "lg" (Dashboard card / modal active view)  and  "sm" (compact).
 * The glow only appears when the timer is running (active = true).
 */

import './FocusTimer.css';

interface FocusTimerProps {
  /** Elapsed seconds to display */
  seconds: number;
  /** Whether the session is currently running — controls glow + pulse */
  active?: boolean;
  /** Visual size — lg (default) for card/modal, sm for compact contexts */
  size?: 'lg' | 'sm';
  /** Planned duration in minutes — when set, shows remaining time label */
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

export function FocusTimer({ seconds, active = false, size = 'lg', plannedMinutes }: FocusTimerProps) {
  const targetSeconds = plannedMinutes ? plannedMinutes * 60 : null;
  const remaining = targetSeconds ? Math.max(0, targetSeconds - seconds) : null;
  const overtime = targetSeconds ? seconds > targetSeconds : false;

  return (
    <div className={`focus-glow-timer focus-glow-timer--${size}${active ? ' focus-glow-timer--active' : ''}${overtime ? ' focus-glow-timer--overtime' : ''}`}>
      {active && <div className="focus-glow-timer__glow" aria-hidden="true" />}
      <span className="focus-glow-timer__digits">{formatTime(seconds)}</span>
      {active && remaining !== null && (
        <span className="focus-glow-timer__remaining">
          {overtime ? 'Overtime' : `${formatTime(remaining)} left`}
        </span>
      )}
    </div>
  );
}
