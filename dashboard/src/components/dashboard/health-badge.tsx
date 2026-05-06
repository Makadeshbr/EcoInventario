type HealthStatus = 'healthy' | 'warning' | 'critical' | 'dead';

const HEALTH_LABELS: Record<HealthStatus, string> = {
  healthy: 'Saudavel',
  warning: 'Atencao',
  critical: 'Critico',
  dead: 'Morto',
};

const HEALTH_CLASSES: Record<HealthStatus, string> = {
  healthy: 'bg-tertiary-fixed/45 text-on-tertiary-fixed',
  warning: 'bg-secondary-container text-secondary',
  critical: 'bg-red-50 text-error',
  dead: 'bg-primary text-on-primary',
};

const DOT_CLASSES: Record<HealthStatus, string> = {
  healthy: 'bg-tertiary-fixed',
  warning: 'bg-yellow-500',
  critical: 'bg-error',
  dead: 'bg-on-primary',
};

export function HealthBadge({ status }: { status: HealthStatus }) {
  const label = HEALTH_LABELS[status];

  return (
    <span
      aria-label={`Status de saude: ${label}`}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase ${HEALTH_CLASSES[status]}`}
    >
      <span className={`h-2 w-2 rounded-full ${DOT_CLASSES[status]}`} />
      {label}
    </span>
  );
}
