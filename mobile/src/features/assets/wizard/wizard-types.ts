export type Step = 1 | 2 | 3 | 4;

export interface WizardState {
  assetTypeId: string;
  assetTypeName: string;
  notes: string;
  latitude: number | null;
  longitude: number | null;
  gpsAccuracyM: number | null;
  photoUris: string[];
}

export const WIZARD_INITIAL: WizardState = {
  assetTypeId: '',
  assetTypeName: '',
  notes: '',
  latitude: null,
  longitude: null,
  gpsAccuracyM: null,
  photoUris: [],
};

export const STEP_TITLES = ['Tipo e Notas', 'Localização', 'Fotos', 'Revisão'] as const;
