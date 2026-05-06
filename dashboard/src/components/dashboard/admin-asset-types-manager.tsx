'use client';

import { FormEvent, useState, useTransition } from 'react';
import { Check, Pencil, Plus, X } from 'lucide-react';

import type { CreateAssetTypeInput, UpdateAssetTypeInput } from '@/features/admin/api';
import type { AdminAssetType } from '@/features/admin/schemas';

import { AdminAssetTypeDialog } from './admin-asset-type-dialog';

type Props = {
  assetTypes: AdminAssetType[];
  createAssetTypeAction: (input: CreateAssetTypeInput) => Promise<void>;
  updateAssetTypeAction: (id: string, input: UpdateAssetTypeInput) => Promise<void>;
};

export function AdminAssetTypesManager({
  assetTypes,
  createAssetTypeAction,
  updateAssetTypeAction,
}: Props) {
  const [items, setItems] = useState(assetTypes);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload: CreateAssetTypeInput = {
      name: String(form.get('name') ?? ''),
      description: String(form.get('description') ?? ''),
    };
    startTransition(async () => {
      setError(null);
      await createAssetTypeAction(payload).then(
        () => setCreating(false),
        () => setError('Nao foi possivel salvar o tipo.'),
      );
    });
  }

  function submitEdit(event: FormEvent<HTMLFormElement>, assetType: AdminAssetType) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload: UpdateAssetTypeInput = {
      name: String(form.get('name') ?? assetType.name),
      description: String(form.get('description') ?? ''),
    };
    startTransition(async () => {
      setError(null);
      await updateAssetTypeAction(assetType.id, payload).then(
        () => {
          setItems((current) =>
            current.map((item) => (item.id === assetType.id ? { ...item, ...payload } : item)),
          );
          setEditingId(null);
        },
        () => setError('Nao foi possivel atualizar o tipo.'),
      );
    });
  }

  function toggleActive(assetType: AdminAssetType) {
    startTransition(async () => {
      setError(null);
      await updateAssetTypeAction(assetType.id, { isActive: !assetType.isActive }).then(
        () => {
          setItems((current) =>
            current.map((item) =>
              item.id === assetType.id ? { ...item, isActive: !assetType.isActive } : item,
            ),
          );
        },
        () => setError('Nao foi possivel alterar o status.'),
      );
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-on-primary"
        >
          <Plus className="h-5 w-5" aria-hidden />
          Novo tipo
        </button>
      </div>

      {error ? (
        <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-error">
          {error}
        </div>
      ) : null}

      <section className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-white/40 text-xs font-bold uppercase text-outline">
              <tr>
                <th className="px-5 py-4">Nome</th>
                <th className="px-5 py-4">Descricao</th>
                <th className="px-5 py-4">Ativo</th>
                <th className="px-5 py-4 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/60">
              {items.map((assetType) => (
                <tr key={assetType.id} className="transition hover:bg-white/40">
                  {editingId === assetType.id ? (
                    <td className="px-5 py-4" colSpan={4}>
                      <form
                        className="grid gap-3 lg:grid-cols-[1fr_2fr_auto_auto]"
                        onSubmit={(event) => submitEdit(event, assetType)}
                      >
                        <input
                          name="name"
                          required
                          defaultValue={assetType.name}
                          className="input-shell h-11 rounded-full border border-outline-variant bg-white/70 px-4 text-sm font-semibold outline-none"
                        />
                        <input
                          name="description"
                          defaultValue={assetType.description ?? ''}
                          className="input-shell h-11 rounded-full border border-outline-variant bg-white/70 px-4 text-sm font-semibold outline-none"
                        />
                        <button
                          type="submit"
                          aria-label="Salvar edicao"
                          className="grid h-11 w-11 place-items-center rounded-full bg-primary text-on-primary"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Cancelar edicao"
                          onClick={() => setEditingId(null)}
                          className="grid h-11 w-11 place-items-center rounded-full bg-white/70"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </form>
                    </td>
                  ) : (
                    <>
                      <td className="px-5 py-4 font-bold text-primary">{assetType.name}</td>
                      <td className="px-5 py-4 text-sm text-on-surface-variant">
                        {assetType.description || 'Sem descricao'}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={assetType.isActive}
                          aria-label={`${assetType.isActive ? 'Desativar' : 'Ativar'} ${assetType.name}`}
                          onClick={() => toggleActive(assetType)}
                          className={`h-7 w-12 rounded-full p-1 transition ${
                            assetType.isActive ? 'bg-secondary' : 'bg-outline-variant'
                          }`}
                        >
                          <span
                            className={`block h-5 w-5 rounded-full bg-white transition ${
                              assetType.isActive ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            aria-label={`Editar ${assetType.name}`}
                            onClick={() => setEditingId(assetType.id)}
                            className="grid h-10 w-10 place-items-center rounded-full bg-white/70 text-secondary"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {creating ? (
        <AdminAssetTypeDialog
          title="Novo tipo"
          onClose={() => setCreating(false)}
          onSubmit={submitCreate}
        />
      ) : null}
    </div>
  );
}
