import { create } from 'zustand';

/**
 * Estado de UI do mapa compartilhado entre a tela e o layout de abas.
 *
 * Motivo: a tab bar do visitante é renderizada pelo navegador (irmã da tela na
 * árvore), então nenhum zIndex de dentro da tela a cobre. Para a prévia do
 * ativo não ficar atrás da barra, a própria barra precisa saber que a prévia
 * está aberta.
 */
interface MapUiState {
  isPreviewOpen: boolean;
  setPreviewOpen: (open: boolean) => void;
}

export const useMapUiStore = create<MapUiState>((set) => ({
  isPreviewOpen: false,
  setPreviewOpen: (isPreviewOpen) => set({ isPreviewOpen }),
}));
