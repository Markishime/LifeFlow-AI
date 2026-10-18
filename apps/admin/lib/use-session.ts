'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getLocalSession, supabase } from './supabase';

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    setSession(getLocalSession());
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session ?? getLocalSession()); setRestored(true); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next ?? getLocalSession()); setRestored(true); });
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, restored };
}
