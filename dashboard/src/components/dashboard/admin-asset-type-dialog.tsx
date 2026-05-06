'use client';

import { FormEvent } from 'react';
import { X } from 'lucide-react';

export function AdminAssetTypeDialog({
  title,
  onClose,
  onSubmit,
}: {
  title: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/20 p-5">
      <form className="login-panel w-full max-w-xl p-6" onSubmit={onSubmit}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-primary">{title}</h2>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-white/70">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-bold text-on-surface-variant">
            Nome
            <input
              name="name"
              required
              maxLength={100}
              className="input-shell h-12 rounded-full border border-outline-variant bg-white/70 px-4 text-on-surface outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-on-surface-variant">
            Descricao
            <textarea
              name="description"
              maxLength={500}
              rows={4}
              className="input-shell rounded-[20px] border border-outline-variant bg-white/70 px-4 py-3 text-on-surface outline-none"
            />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-11 rounded-full bg-white/70 px-5 text-sm font-bold">
            Cancelar
          </button>
          <button type="submit" className="h-11 rounded-full bg-primary px-5 text-sm font-bold text-on-primary">
            Salvar tipo
          </button>
        </div>
      </form>
    </div>
  );
}
