import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { AdminAssetTypesManager } from '../admin-asset-types-manager';
import { AdminUsersManager } from '../admin-users-manager';
import { AuditLogsTable } from '../audit-logs-table';

const users = [
  {
    id: 'user-1',
    name: 'Admin Maria',
    email: 'admin@example.com',
    role: 'admin' as const,
    isActive: true,
    createdAt: '2026-05-04T10:00:00Z',
  },
  {
    id: 'user-2',
    name: 'Tecnico Joao',
    email: 'tech@example.com',
    role: 'tech' as const,
    isActive: false,
    createdAt: '2026-05-03T10:00:00Z',
  },
];

describe('AdminUsersManager', () => {
  test('renderiza tabela, abre modal de novo usuario e impede auto-delete', async () => {
    const createUser = vi.fn().mockResolvedValue(undefined);
    const updateUser = vi.fn().mockResolvedValue(undefined);
    const deleteUser = vi.fn().mockResolvedValue(undefined);

    render(
      <AdminUsersManager
        users={users}
        currentUserId="user-1"
        hasMore={false}
        nextCursor={null}
        createUserAction={createUser}
        updateUserAction={updateUser}
        deleteUserAction={deleteUser}
      />,
    );

    expect(screen.getByText('Admin Maria')).toBeInTheDocument();
    expect(screen.getByText('TECH')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /excluir propria conta/i })).toBeDisabled();
    expect(screen.getByRole('switch', { name: /desativar propria conta bloqueado/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /novo usuario/i }));
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Viewer Bia' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'bia@example.com' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'senhaSegura123' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'viewer' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar usuario/i }));

    await waitFor(() =>
      expect(createUser).toHaveBeenCalledWith({
        name: 'Viewer Bia',
        email: 'bia@example.com',
        password: 'senhaSegura123',
        role: 'viewer',
      }),
    );

    fireEvent.click(screen.getByRole('switch', { name: /ativar tecnico joao/i }));
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith('user-2', { isActive: true }));
    expect(deleteUser).not.toHaveBeenCalledWith('user-1');
  });
});

describe('AdminAssetTypesManager', () => {
  test('cria tipo, edita inline e alterna ativo', async () => {
    const createAssetType = vi.fn().mockResolvedValue(undefined);
    const updateAssetType = vi.fn().mockResolvedValue(undefined);

    render(
      <AdminAssetTypesManager
        assetTypes={[
          { id: 'type-1', name: 'Arvore', description: 'Especime arboreo', isActive: true },
        ]}
        createAssetTypeAction={createAssetType}
        updateAssetTypeAction={updateAssetType}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /novo tipo/i }));
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Nascente' } });
    fireEvent.change(screen.getByLabelText(/descricao/i), { target: { value: 'Agua natural' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar tipo/i }));

    await waitFor(() =>
      expect(createAssetType).toHaveBeenCalledWith({
        name: 'Nascente',
        description: 'Agua natural',
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: /editar arvore/i }));
    fireEvent.change(screen.getByDisplayValue('Especime arboreo'), {
      target: { value: 'Arvore inventariada' },
    });
    fireEvent.click(screen.getByRole('button', { name: /salvar edicao/i }));

    await waitFor(() =>
      expect(updateAssetType).toHaveBeenCalledWith('type-1', {
        name: 'Arvore',
        description: 'Arvore inventariada',
      }),
    );

    fireEvent.click(screen.getByRole('switch', { name: /desativar arvore/i }));
    await waitFor(() => expect(updateAssetType).toHaveBeenCalledWith('type-1', { isActive: false }));
  });
});

describe('AuditLogsTable', () => {
  test('mostra filtros, paginacao e diff visual expandido', () => {
    render(
      <AuditLogsTable
        logs={[
          {
            id: 'log-1',
            entityType: 'asset',
            entityId: 'asset-1',
            action: 'approve',
            performedBy: { id: 'user-1', name: 'Admin Maria' },
            changes: { status: { old: 'pending', new: 'approved' } },
            metadata: {},
            createdAt: '2026-05-04T10:00:00Z',
          },
        ]}
        filters={{ entity_type: 'asset' }}
        hasMore
        nextCursor="log-1"
      />,
    );

    expect(screen.getByDisplayValue('asset')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /expandir log approve asset/i }));

    expect(screen.getByText('status')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('approved')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /proxima pagina/i })).toHaveAttribute(
      'href',
      '/dashboard/audit?entity_type=asset&cursor=log-1',
    );
  });
});
