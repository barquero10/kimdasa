const rawApiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;

export const API_BASE_URL = rawApiBase?.trim().replace(/\/+$/, "") ?? "";

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
