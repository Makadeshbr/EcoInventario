'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

import type { ApprovalEntityType } from '@/features/approval/types';

type ApprovalResult = 'approved' | 'rejected';

export function ApprovalActions({
  entityType,
  id,
  onDone,
}: {
  entityType: ApprovalEntityType;
  id: string;
  onDone?: (result: ApprovalResult) => void;
}) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<ApprovalResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setBusy('approved');
    setError(null);
    const response = await fetch(`/api/dashboard/${entityType}/${id}/approve`, { method: 'POST' });
    setBusy(null);
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? 'Falha ao aprovar registro');
      return;
    }
    onDone?.('approved');
  }

  async function reject() {
    if (!reason.trim()) {
      setError('Informe o motivo da rejeicao');
      return;
    }

    setBusy('rejected');
    setError(null);
    const response = await fetch(`/api/dashboard/${entityType}/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    setBusy(null);
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? 'Falha ao rejeitar registro');
      return;
    }
    setRejectOpen(false);
    setReason('');
    onDone?.('rejected');
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={approve}
          disabled={busy !== null}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-on-primary disabled:opacity-60"
        >
          {busy === 'approved' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Aprovar
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setRejectOpen(true);
          }}
          disabled={busy !== null}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-red-50 px-4 text-sm font-bold text-error disabled:opacity-60"
        >
          <XCircle className="h-4 w-4" />
          Rejeitar
        </button>
        {error && !rejectOpen ? <p className="basis-full text-xs font-bold text-error">{error}</p> : null}
      </div>

      {rejectOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/30 px-5">
          <div className="login-panel w-full max-w-lg p-6">
            <p className="text-xs font-bold uppercase text-secondary">Rejeicao</p>
            <h2 className="mt-2 text-2xl font-semibold text-primary">Motivo da rejeicao</h2>
            <label className="mt-5 block">
              <span className="text-sm font-bold text-on-surface-variant">Motivo</span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-2 min-h-32 w-full rounded-[24px] border border-outline-variant bg-white/70 p-4 outline-none focus:border-secondary"
                placeholder="Descreva o ajuste necessario"
              />
            </label>
            {error ? <p className="mt-3 text-sm font-bold text-error">{error}</p> : null}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setRejectOpen(false);
                  setReason('');
                  setError(null);
                }}
                className="h-11 rounded-full bg-surface-container px-4 text-sm font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={reject}
                disabled={busy !== null}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-on-primary disabled:opacity-60"
              >
                {busy === 'rejected' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirmar rejeicao
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
