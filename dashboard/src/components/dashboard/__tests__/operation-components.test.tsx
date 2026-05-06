import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { ApprovalActions } from '../approval-actions';
import { HealthBadge } from '../health-badge';
import { PhotoComparison } from '../photo-comparison';

describe('HealthBadge', () => {
  test('exibe label e marcador visual do health_status', () => {
    render(<HealthBadge status="critical" />);

    expect(screen.getByText('Critico')).toBeInTheDocument();
    expect(screen.getByLabelText('Status de saude: Critico')).toBeInTheDocument();
  });
});

describe('PhotoComparison', () => {
  test('renderiza fotos antes e depois lado a lado', () => {
    render(
      <PhotoComparison
        beforeUrl="https://example.com/before.jpg"
        afterUrl="https://example.com/after.jpg"
      />,
    );

    expect(screen.getByRole('img', { name: /foto antes/i })).toHaveAttribute(
      'src',
      'https://example.com/before.jpg',
    );
    expect(screen.getByRole('img', { name: /foto depois/i })).toHaveAttribute(
      'src',
      'https://example.com/after.jpg',
    );
  });

  test('mostra estado vazio quando storage nao retorna URL', () => {
    render(<PhotoComparison beforeUrl={null} afterUrl={null} />);

    expect(screen.getByText('Antes indisponivel')).toBeInTheDocument();
    expect(screen.getByText('Depois indisponivel')).toBeInTheDocument();
  });
});

describe('ApprovalActions', () => {
  test('aprova e chama callback de conclusao', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    const onDone = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<ApprovalActions entityType="manejo" id="m-1" onDone={onDone} />);

    fireEvent.click(screen.getByRole('button', { name: /aprovar/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/dashboard/manejo/m-1/approve', { method: 'POST' }));
    expect(onDone).toHaveBeenCalledWith('approved');
  });

  test('rejeitar exige motivo antes de chamar API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<ApprovalActions entityType="monitoramento" id="mon-1" />);

    fireEvent.click(screen.getByRole('button', { name: /rejeitar/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar rejeicao/i }));

    expect(await screen.findByText(/informe o motivo/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
