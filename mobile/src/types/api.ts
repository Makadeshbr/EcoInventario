import type { MediaType, User } from './domain';

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
    requestId: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: { nextCursor: string | null; hasMore: boolean };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface UploadUrlRequest {
  assetId: string;
  mediaType: MediaType;
  mimeType: string;
  sizeBytes: number;
  idempotencyKey: string;
}

export interface UploadUrlResponse {
  mediaId: string;
  uploadUrl: string;
  expiresIn: number;
}
