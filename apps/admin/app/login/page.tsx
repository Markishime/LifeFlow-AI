'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Profile } from '@lifeflow/api-contracts';
import { Button } from '../../components/ui/button';
import { AuthShell, inputClass } from '../../components/auth/auth-shell';
import { supabase, setLocalSession } from '../../lib/supabase';
import { api } from '../../lib/api';
import { useSession } from '../../lib/use-session';

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });

export default function LoginPage() {
  const router = useRouter();
  const { session, restored } = useSession();
  const [error, setError] = useState('');
  const [devToken, setDevToken] = useState('');
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });

  useEffect(() => { if (restored && session) router.replace('/console'); }, [restored, session, router]);

  return (
    <AuthShell
      eyebrow="Operations Console"
      headline="Cinematic Intelligence Hub"
      subline
      description="Access the neural interface for system orchestration. Authenticate with administrator credentials."
      footer={
        <>
          No access ID yet? <Link href="/signup" className="text-cyan-400 hover:text-cyan-300 underline-offset-4 hover:underline">Create one now</Link>
          <br />
          <Link href="/forgot-password" className="text-slate-500 hover:text-purple-300 text-xs underline-offset-4 hover:underline mt-2 inline-block">Lost your access code? Recover it</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(async values => {
        setError('');
        const { error } = await supabase.auth.signInWithPassword(values);
        if (error) setError(error.message);
        else router.push('/console');
      })} className="space-y-5">
        <div>
          <label htmlFor="email" className="text-sm text-slate-300 mb-2 block">EMAIL ID</label>
          <input
            {...register('email')}
            id="email"
            type="email"
            autoComplete="username"
            required
            className={inputClass}
            placeholder="admin@lifeflow.ai"
          />
          {errors.email && <p className="text-red-400 text-sm mt-2">Enter a valid email.</p>}
        </div>
        <div>
          <label htmlFor="password" className="text-sm text-slate-300 mb-2 block">ACCESS CODE</label>
          <input
            {...register('password')}
            id="password"
            type="password"
            autoComplete="current-password"
            required
            className={inputClass}
            placeholder="password"
          />
          {errors.password && <p className="text-red-400 text-sm mt-2">Use at least 8 characters.</p>}
        </div>
        {error && <div className="p-3 rounded-xl bg-red-500/20 border border-red-400/40 text-red-300 text-sm">{error}</div>}
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'AUTHENTICATING...' : 'INITIALIZE CONNECTION'}
          <ArrowRight size={16} />
        </Button>
      </form>
      {process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true' && (
        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          onSubmit={event => {
            event.preventDefault();
            void (async () => {
              try {
                const profile = await api<Profile>('/users/me', devToken);
                if (!profile.development) throw new Error('Development authentication is unavailable.');
                setLocalSession({
                  access_token: devToken,
                  refresh_token: '',
                  expires_in: 7200,
                  token_type: 'bearer',
                  user: {
                    id: profile.id,
                    email: profile.email,
                    aud: 'authenticated',
                    app_metadata: {},
                    user_metadata: {},
                    created_at: '',
                  }
                });
                router.push('/console');
              } catch (error) {
                setError(String(error));
              }
            })();
          }}
          className="mt-6 pt-6 border-t border-purple-500/30 space-y-3"
        >
          <label htmlFor="dev-token" className="text-sm text-slate-300 block">LOCAL DEV TOKEN</label>
          <input
            id="dev-token"
            value={devToken}
            onChange={event => setDevToken(event.target.value)}
            type="password"
            className="w-full px-4 py-2 rounded-lg bg-black/40 backdrop-blur-xl border border-purple-500/40 text-white"
            placeholder="Enter token"
          />
          <Button type="submit" size="sm" variant="outline" className="w-full">OPEN LOCAL SESSION</Button>
        </motion.form>
      )}
    </AuthShell>
  );
}
