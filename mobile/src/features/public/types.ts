export interface PublicAssetType {
  id: string;
  name: string;
}

export interface PublicAssetMarker {
  id: string;
  asset_type: { id: string; name: string };
  latitude: number;
  longitude: number;
  qr_code: string;
  thumbnail_url: string | null;
}

export interface PublicMedia {
  id: string;
  type: string;
  url: string;
}

export interface PublicManejo {
  id: string;
  description: string;
  before_media_url: string | null;
  after_media_url: string | null;
  created_at: string;
}

export interface PublicMonitoramento {
  id: string;
  notes: string;
  health_status: 'healthy' | 'warning' | 'critical' | 'dead';
  created_at: string;
}

export interface PublicAssetDetail {
  id: string;
  asset_type: { id: string; name: string };
  latitude: number;
  longitude: number;
  qr_code: string;
  organization_name: string;
  media: PublicMedia[];
  manejos: PublicManejo[];
  monitoramentos: PublicMonitoramento[];
  created_at: string;
}

export interface QRResolveResult {
  asset_id: string | null;
  is_available: boolean;
}
