import './PageHeaderCard.css';

interface PageHeaderCardProps {
  title: string;
  subtitle: string;
}

export function PageHeaderCard({ title, subtitle }: PageHeaderCardProps) {
  return (
    <section className="page-header-card glass">
      <h1 className="page-header-title">{title}</h1>
      <p className="page-header-subtitle">{subtitle}</p>
    </section>
  );
}
