import './Checkbox.css';

export const AnimatedCheckbox = ({
  checked,
  onToggle,
  disabled,
}: {
  id: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) => {
  return (
    <div
      className="task-checkbox-wrap"
      role="checkbox"
      tabIndex={disabled ? -1 : 0}
      aria-checked={checked}
      aria-disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onToggle();
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }
      }}
    >
      <svg
        className={`animated-checkbox-svg${checked ? ' checked' : ''}`}
        width="18px"
        height="18px"
        viewBox="0 0 18 18"
      >
        <path d="M 1 9 L 1 9 c 0 -5 3 -8 8 -8 L 9 1 C 14 1 17 5 17 9 L 17 9 c 0 4 -4 8 -8 8 L 9 17 C 5 17 1 14 1 9 L 1 9 Z" />
        <polyline points="1 9 7 14 15 4" />
      </svg>
    </div>
  );
};
