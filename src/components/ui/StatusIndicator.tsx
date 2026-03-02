import './StatusIndicator.css';

export type TaskStatus = 'not_started' | 'in_progress' | 'completed';
export type PlanStatus = 'active' | 'completed' | 'archived' | 'draft';
export type GoalStatus = 'active' | 'in_progress' | 'completed';

type StatusIndicatorProps = {
  status: TaskStatus | PlanStatus | GoalStatus;
  size?: 'sm' | 'md' | 'lg';
};

/**
 * Maps any entity status to the indicator's visual state.
 *
 *   not_started / draft / archived → idle (gray)
 *   in_progress / active          → progress (orange pulse)
 *   completed                     → done (green, larger)
 */
function resolveVisual(status: string): 'not-started' | 'in-progress' | 'completed' {
  switch (status) {
    case 'in_progress':
    case 'active':
      return 'in-progress';
    case 'completed':
      return 'completed';
    case 'not_started':
    case 'draft':
    case 'archived':
    default:
      return 'not-started';
  }
}

export default function StatusIndicator({ status, size = 'md' }: StatusIndicatorProps) {
  const visual = resolveVisual(status);

  return (
    <div
      className={`status-indicator status-indicator--${size} status-indicator--${visual}`}
      role="img"
      aria-label={status.replace(/_/g, ' ')}
    >
      <div className="status-indicator__ring" />
      <div className="status-indicator__core" />
    </div>
  );
}
