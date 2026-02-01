import './PageHeaderCard.css';

interface PageHeaderCardProps {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function PageHeaderCard({ title, subtitle, actionLabel, onAction }: PageHeaderCardProps) {
  return (
    <section className="page-header-card glass">
      <div className="page-header-content">
        <div>
          <h1 className="page-header-title">{title}</h1>
          <p className="page-header-subtitle">{subtitle}</p>
        </div>
        {actionLabel && onAction && (
          <button className="page-header-action-btn" onClick={onAction}>
            {actionLabel}
          </button>
        )}
      </div>
    </section>
  );
}
