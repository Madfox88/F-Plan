import type { ReactNode } from 'react';
import './PageHeaderCard.css';

interface PageHeaderCardProps {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
  subtitleMenu?: ReactNode;
}

export function PageHeaderCard({ title, subtitle, actionLabel, onAction, subtitleMenu }: PageHeaderCardProps) {
  return (
    <section className="page-header-card glass">
      <div className="page-header-content">
        <div className="page-header-text">
          <h1 className="page-header-title">{title}</h1>
          <div className="page-header-subtitle-wrapper">
            <p className="page-header-subtitle">{subtitle}</p>
            {subtitleMenu}
          </div>
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
