'use client';

import { FormEvent } from 'react';
import { X } from 'lucide-react';

import type { AdminUser } from '@/features/admin/schemas';

export function AdminUserDialog({
  title,
  user,
  editing = false,
  onClose,
  onSubmit,
}: {
  title: string;
  user?: AdminUser;
  editing?: boolean;
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
              minLength={2}
              defaultValue={user?.name ?? ''}
              className="input-shell h-12 rounded-full border border-outline-variant bg-white/70 px-4 text-on-surface outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-on-surface-variant">
            Email
            <input
              name="email"
              type="email"
              required={!editing}
              disabled={editing}
              defaultValue={user?.email ?? ''}
              className="input-shell h-12 rounded-full border border-outline-variant bg-white/70 px-4 text-on-surface outline-none disabled:opacity-60"
            />
          </label>
          {!editing ? (
            <label className="grid gap-2 text-sm font-bold text-on-surface-variant">
              Senha
              <input
                name="password"
                type="password"
                required
                minLength={8}
                className="input-shell h-12 rounded-full border border-outline-variant bg-white/70 px-4 text-on-surface outline-none"
              />
            </label>
          ) : null}
          <label className="grid gap-2 text-sm font-bold text-on-surface-variant">
            Role
            <select
              name="role"
              defaultValue={user?.role ?? 'tech'}
              className="h-12 rounded-full border border-outline-variant bg-white/70 px-4 text-sm font-semibold"
            >
              <option value="tech">TECH</option>
              <option value="admin">ADMIN</option>
              <option value="viewer">VIEWER</option>
            </select>
          </label>
          {editing ? <input type="hidden" name="is_active" value={user?.isActive ? 'true' : 'false'} /> : null}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-11 rounded-full bg-white/70 px-5 text-sm font-bold">
            Cancelar
          </button>
          <button type="submit" className="h-11 rounded-full bg-primary px-5 text-sm font-bold text-on-primary">
            Salvar usuario
          </button>
        </div>
      </form>
    </div>
  );
}
