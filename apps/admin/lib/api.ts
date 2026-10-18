export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function api<T>(path: string, token: string, method = 'GET'): Promise<T> {
  const response = await fetch(`${API}/api/v1${path}`, { method, headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Request failed');
  return data;
}
