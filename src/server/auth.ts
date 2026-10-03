export const DEFAULT_DEV_OWNER_TOKEN = 'jarvis-dev-owner-token';

export function resolveOwnerAccessToken(): string {
  const configured = (process.env.OWNER_ACCESS_TOKEN || '').trim();
  if (configured) return configured;

  if (process.env.NODE_ENV === 'production') {
    return '';
  }

  return DEFAULT_DEV_OWNER_TOKEN;
}

export function isDevOwnerFallback(): boolean {
  return !process.env.OWNER_ACCESS_TOKEN && process.env.NODE_ENV !== 'production';
}
