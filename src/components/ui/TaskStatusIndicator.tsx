import './TaskStatusIndicator.css';

export type TaskStatus = 'not_started' | 'in_progress' | 'completed';

interface TaskStatusIndicatorProps {
  status: TaskStatus;
}

export function TaskStatusIndicator({ status }: TaskStatusIndicatorProps) {
  return (
    <span className={`task-status-indicator ${status}`} aria-hidden="true" />
  );
}
