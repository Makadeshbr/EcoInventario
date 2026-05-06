import type { Asset } from '@/features/assets/schemas';
import type { Manejo, Monitoramento } from '@/features/operations/schemas';

export type ApprovalEntityType = 'asset' | 'manejo' | 'monitoramento';

export type ApprovalItem =
  | { entityType: 'asset'; id: string; title: string; owner: string; createdAt: string; data: Asset }
  | { entityType: 'manejo'; id: string; title: string; owner: string; createdAt: string; data: Manejo }
  | {
      entityType: 'monitoramento';
      id: string;
      title: string;
      owner: string;
      createdAt: string;
      data: Monitoramento;
    };
