export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 1920;
export const JPEG_QUALITY = 0.8;
export const MAX_PHOTOS_PER_ASSET = 20;

export const MAX_SYNC_BATCH_SIZE = 50;
export const SYNC_INTERVAL_MS = 30_000;
export const SYNC_TIMEOUT_MS = 30_000;
export const MAX_METADATA_RETRIES = 5;
export const MAX_MEDIA_RETRIES = 3;
export const RETRY_BASE_DELAY_MS = 1_000;
export const RETRY_MAX_DELAY_MS = 300_000;

export const GPS_ACCURACY_THRESHOLD_M = 50;
export const DEFAULT_PAGE_SIZE = 20;
