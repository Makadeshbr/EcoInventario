export type AssetStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'dead';
export type MediaType = 'before' | 'after' | 'general';
export type UserRole = 'tech' | 'admin' | 'viewer';

export interface Asset {
  id: string;
  organizationId: string;
  assetTypeId: string;
  assetTypeName: string;
  latitude: number;
  longitude: number;
  gpsAccuracyM: number | null;
  qrCode: string;
  status: AssetStatus;
  version: number;
  parentId: string | null;
  rejectionReason: string | null;
  notes: string | null;
  createdBy: string;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  isSynced: boolean;
}

export interface AssetType {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface Media {
  id: string;
  organizationId: string;
  assetId: string;
  localFilePath: string;
  storageKey: string | null;
  mimeType: string;
  sizeBytes: number;
  type: MediaType;
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed';
  createdBy: string;
  createdAt: string;
}

export interface Manejo {
  id: string;
  organizationId: string;
  assetId: string;
  description: string;
  beforeMediaId: string | null;
  afterMediaId: string | null;
  status: AssetStatus;
  rejectionReason: string | null;
  createdBy: string;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  isSynced: boolean;
}

export interface Monitoramento {
  id: string;
  organizationId: string;
  assetId: string;
  notes: string;
  healthStatus: HealthStatus;
  status: AssetStatus;
  rejectionReason: string | null;
  createdBy: string;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  isSynced: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
}
