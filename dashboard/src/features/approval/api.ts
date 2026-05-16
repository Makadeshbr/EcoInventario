import { listAssets } from '@/features/assets/api';
import { listManejos, listMonitoramentos } from '@/features/operations/api';

import type { ApprovalItem } from './types';

type ApprovalQueueResult = {
  items: ApprovalItem[];
  warnings: string[];
};

type Paginated<T> = {
  data: T[];
  pagination: {
    next_cursor: string | null;
    has_more: boolean;
  };
};

async function collectPendingPages<T>(
  fetchPage: (cursor?: string) => Promise<Paginated<T>>,
): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | undefined;

  do {
    const page = await fetchPage(cursor);
    items.push(...page.data);
    cursor = page.pagination.has_more && page.pagination.next_cursor ? page.pagination.next_cursor : undefined;
  } while (cursor);

  return items;
}

export async function listApprovalQueue(token: string): Promise<ApprovalQueueResult> {
  const [assetsResult, manejosResult, monitoramentosResult] = await Promise.allSettled([
    collectPendingPages((cursor) => listAssets(token, { status: 'pending', limit: 100, cursor })),
    collectPendingPages((cursor) => listManejos(token, { status: 'pending', limit: 100, cursor })),
    collectPendingPages((cursor) => listMonitoramentos(token, { status: 'pending', limit: 100, cursor })),
  ]);

  const warnings: string[] = [];
  if (assetsResult.status === 'rejected') {
    warnings.push(`Nao foi possivel carregar assets pendentes: ${assetsResult.reason instanceof Error ? assetsResult.reason.message : 'erro desconhecido'}.`);
  }
  if (manejosResult.status === 'rejected') {
    warnings.push(`Nao foi possivel carregar manejos pendentes: ${manejosResult.reason instanceof Error ? manejosResult.reason.message : 'erro desconhecido'}.`);
  }
  if (monitoramentosResult.status === 'rejected') {
    warnings.push(`Nao foi possivel carregar monitoramentos pendentes: ${monitoramentosResult.reason instanceof Error ? monitoramentosResult.reason.message : 'erro desconhecido'}.`);
  }

  const assets = assetsResult.status === 'fulfilled' ? assetsResult.value : [];
  const manejos = manejosResult.status === 'fulfilled' ? manejosResult.value : [];
  const monitoramentos =
    monitoramentosResult.status === 'fulfilled' ? monitoramentosResult.value : [];

  const items = [
    ...assets.map(
      (asset): ApprovalItem => ({
        entityType: 'asset',
        id: asset.id,
        title: asset.assetType.name,
        owner: asset.createdBy.name,
        createdAt: asset.createdAt,
        data: asset,
      }),
    ),
    ...manejos.map(
      (manejo): ApprovalItem => ({
        entityType: 'manejo',
        id: manejo.id,
        title: 'Manejo',
        owner: manejo.createdBy.name,
        createdAt: manejo.createdAt,
        data: manejo,
      }),
    ),
    ...monitoramentos.map(
      (monitoramento): ApprovalItem => ({
        entityType: 'monitoramento',
        id: monitoramento.id,
        title: 'Monitoramento',
        owner: monitoramento.createdBy.name,
        createdAt: monitoramento.createdAt,
        data: monitoramento,
      }),
    ),
  ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return { items, warnings };
}
