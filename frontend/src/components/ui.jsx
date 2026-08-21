import { formatNumber } from "../utils/formatters";

export function PageLoader({ label = "Loading" }) {
  return (
    <main className="center-stage">
      <div className="loader" aria-label={label} />
      <p>{label}</p>
    </main>
  );
}

export function SectionHeader({ eyebrow, title, children }) {
  return (
    <div className="section-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function EmptyState({ title, message }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}

export function ErrorState({ message }) {
  return <p className="inline-error">{message}</p>;
}

export function StatGrid({ stats }) {
  return (
    <div className="stat-grid">
      {stats.map((stat) => (
        <div className="stat-card" key={stat.label}>
          <span>{stat.label}</span>
          <strong>{formatNumber(stat.value)}</strong>
        </div>
      ))}
    </div>
  );
}
