import {Platform} from 'react-native';
import {useSession} from '../store/session';
import {supabase} from './auth';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000');
export class ApiError extends Error {constructor(message: string, public status: number) {super(message);}}
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useSession.getState().session?.access_token;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${API_URL}/api/v1${path}`, {...options, signal: controller.signal,
      headers: {...(options.body instanceof FormData ? {} : {'Content-Type': 'application/json'}),
        Authorization: `Bearer ${token || ''}`, ...options.headers}});
    if (response.status === 204) return undefined as T;
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401) {
        useSession.getState().setSession(null);
        await supabase.auth.signOut({scope: 'local'});
      }
      throw new ApiError(data.error?.message || 'Request failed', response.status);
    }
    return data as T;
  } finally {clearTimeout(timer);}
}
export const post = <T,>(path: string, data: unknown) => request<T>(path, {method: 'POST', body: JSON.stringify(data)});
export const patch = <T,>(path: string, data: unknown) => request<T>(path, {method: 'PATCH', body: JSON.stringify(data)});
