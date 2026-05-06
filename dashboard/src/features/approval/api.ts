import { listAssets } from '@/features/assets/api';
import { listManejos, listMonitoramentos } from '@/features/operations/api';

import type { ApprovalItem } from './types';

type ApprovalQueueResult = {
  items: ApprovalItem[];
  warnings: string[];
};

export async function listApprovalQueue(token: string): Promise<ApprovalQueueResult> {
  const [assetsResult, manejosResult, monitoramentosResult] = await Promise.allSettled([
    listAssets(token, { status: 'pending', limit: 50 }),
    listManejos(token, { status: 'pending', limit: 50 }),
    listMonitoramentos(token, { status: 'pending', limit: 50 }),
  ]);

  const warnings: string[] = [];
  if (assetsResult.status === 'rejected') {
    warnings.push('Nao foi possivel carregar assets pendentes.');
  }
  if (manejosResult.status === 'rejected') {
    warnings.push('Nao foi possivel carregar manejos pendentes.');
  }
  if (monitoramentosResult.status === 'rejected') {
    warnings.push('Nao foi possivel carregar monitoramentos pendentes.');
  }

  const assets = assetsResult.status === 'fulfilled' ? assetsResult.value.data : [];
  const manejos = manejosResult.status === 'fulfilled' ? manejosResult.value.data : [];
  const monitoramentos =
    monitoramentosResult.status === 'fulfilled' ? monitoramentosResult.value.data : [];

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
