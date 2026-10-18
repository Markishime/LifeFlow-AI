import {create} from 'zustand';
import type {Session} from '@supabase/supabase-js';

type State = {session: Session | null; restored: boolean; theme: 'system' | 'light' | 'dark';
  deviceId: string | null; setDevice: (id: string | null) => void;
  setSession: (session: Session | null) => void; setRestored: () => void; setTheme: (theme: State['theme']) => void};
export const useSession = create<State>(set => ({session: null, restored: false, theme: 'system', deviceId: null,
  setDevice: deviceId => set({deviceId}), setSession: session => set({session}),
  setRestored: () => set({restored: true}), setTheme: theme => set({theme})}));
