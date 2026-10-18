import { createClient, type Session } from '@supabase/supabase-js';

export const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://unconfigured.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'unconfigured', { auth: { persistSession: false } });

// Local development sessions (dev JWT) live outside Supabase auth state.
let localSession: Session | null = null;

export function getLocalSession(): Session | null {
  return localSession;
}

export function setLocalSession(session: Session | null) {
  localSession = session;
}
