'use client';

import Link from 'next/link';
import { FormEvent, useState, useTransition } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';

import type { CreateUserInput, UpdateUserInput } from '@/features/admin/api';
import type { AdminUser } from '@/features/admin/schemas';
import type { UserRole } from '@/types/domain';

import { AdminUserDialog } from './admin-user-dialog';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'ADMIN',
  tech: 'TECH',
  viewer: 'VIEWER',
};

const ROLE_CLASSES: Record<UserRole, string> = {
  admin: 'bg-primary text-on-primary',
  tech: 'bg-secondary-container text-secondary',
  viewer: 'bg-surface-container-high text-on-surface-variant',
};

type Props = {
  users: AdminUser[];
  currentUserId: string;
  hasMore: boolean;
  nextCursor: string | null;
  createUserAction: (input: CreateUserInput) => Promise<void>;
  updateUserAction: (id: string, input: UpdateUserInput) => Promise<void>;
  deleteUserAction: (id: string) => Promise<void>;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR');
}

export function AdminUsersManager({
  users,
  currentUserId,
  hasMore,
  nextCursor,
  createUserAction,
  updateUserAction,
  deleteUserAction,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload: CreateUserInput = {
      name: String(form.get('name') ?? ''),
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
      role: String(form.get('role') ?? 'tech') as UserRole,
    };
    startTransition(async () => {
      setError(null);
      await createUserAction(payload).then(
        () => setCreating(false),
        () => setError('Nao foi possivel salvar o usuario.'),
      );
    });
  }

  function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;

    const form = new FormData(event.currentTarget);
    const payload: UpdateUserInput = {
      name: String(form.get('name') ?? ''),
      role: String(form.get('role') ?? editing.role) as UserRole,
      isActive: form.get('is_active') === 'true',
    };
    startTransition(async () => {
      setError(null);
      await updateUserAction(editing.id, payload).then(
        () => setEditing(null),
        () => setError('Nao foi possivel atualizar o usuario.'),
      );
    });
  }

  function toggleActive(user: AdminUser) {
    startTransition(async () => {
      setError(null);
      await updateUserAction(user.id, { isActive: !user.isActive }).catch(() =>
        setError('Nao foi possivel alterar o status.'),
      );
    });
  }

  function deleteUser(user: AdminUser) {
    if (user.id === currentUserId) return;

    startTransition(async () => {
      setError(null);
      await deleteUserAction(user.id).catch(() => setError('Nao foi possivel excluir o usuario.'));
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
          Novo usuario
        </button>
      </div>

      {error ? (
        <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-error">
          {error}
        </div>
      ) : null}

      <section className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="bg-white/40 text-xs font-bold uppercase text-outline">
              <tr>
                <th className="px-5 py-4">Nome</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4">Ativo</th>
                <th className="px-5 py-4">Data criacao</th>
                <th className="px-5 py-4 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/60">
              {users.map((user) => (
                <tr key={user.id} className="transition hover:bg-white/40">
                  <td className="px-5 py-4 font-bold text-primary">{user.name}</td>
                  <td className="px-5 py-4 text-sm text-on-surface-variant">{user.email}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${ROLE_CLASSES[user.role]}`}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={user.isActive}
                      aria-label={
                        user.id === currentUserId
                          ? 'Desativar propria conta bloqueado'
                          : `${user.isActive ? 'Desativar' : 'Ativar'} ${user.name}`
                      }
                      disabled={user.id === currentUserId}
                      onClick={() => toggleActive(user)}
                      className={`h-7 w-12 rounded-full p-1 transition ${
                        user.isActive ? 'bg-secondary' : 'bg-outline-variant'
                      } disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      <span
                        className={`block h-5 w-5 rounded-full bg-white transition ${
                          user.isActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-5 py-4 text-sm text-on-surface-variant">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        aria-label={`Editar ${user.name}`}
                        onClick={() => setEditing(user)}
                        className="grid h-10 w-10 place-items-center rounded-full bg-white/70 text-secondary"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={
                          user.id === currentUserId
                            ? 'Excluir propria conta bloqueado'
                            : `Excluir ${user.name}`
                        }
                        disabled={user.id === currentUserId || isPending}
                        onClick={() => deleteUser(user)}
                        className="grid h-10 w-10 place-items-center rounded-full bg-white/70 text-error disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {hasMore && nextCursor ? (
        <div className="flex justify-center">
          <Link
            className="rounded-full bg-primary px-5 py-3 text-sm font-bold text-on-primary"
            href={`/dashboard/users?cursor=${encodeURIComponent(nextCursor)}`}
          >
            Carregar mais
          </Link>
        </div>
      ) : null}

      {creating ? (
        <AdminUserDialog title="Novo usuario" onClose={() => setCreating(false)} onSubmit={submitCreate} />
      ) : null}
      {editing ? (
        <AdminUserDialog
          title="Editar usuario"
          user={editing}
          onClose={() => setEditing(null)}
          onSubmit={submitEdit}
          editing
        />
      ) : null}
    </div>
  );
}
