import 'react-native-url-polyfill/auto';
import {AppState, Platform} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {createClient} from '@supabase/supabase-js';

const nativeStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};
export const configured = Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://unconfigured.supabase.co',
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'unconfigured', {auth: {
    storage: Platform.OS === 'web' ? undefined : nativeStorage, autoRefreshToken: true,
    persistSession: Platform.OS !== 'web', detectSessionInUrl: false, flowType: 'pkce',
  }});
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', state => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
