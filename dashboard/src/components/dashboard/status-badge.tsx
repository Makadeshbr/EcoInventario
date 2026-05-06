import type { AssetStatus } from '@/types/domain';

const STATUS_LABELS: Record<AssetStatus, string> = {
  draft: 'Rascunho',
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

const STATUS_CLASSES: Record<AssetStatus, string> = {
  draft: 'bg-surface-container-high text-on-surface-variant',
  pending: 'bg-secondary-container text-secondary',
  approved: 'bg-tertiary-fixed/45 text-on-tertiary-fixed',
  rejected: 'bg-red-50 text-error',
};

export function StatusBadge({ status }: { status: AssetStatus }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${STATUS_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
