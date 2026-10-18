'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { AuthShell, inputClass } from '../../components/auth/auth-shell';
import { AnimatedCard, TypingEffect } from '../../components/cinematic';
import { supabase } from '../../lib/supabase';

const resetSchema = z.object({
  password: z.string().min(8, 'Use at least 8 characters'),
  confirm: z.string().min(8, 'Use at least 8 characters'),
}).refine(values => values.password === values.confirm, { message: 'Passwords do not match', path: ['confirm'] });

export default function ResetPasswordPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [done, setDone] = useState(false);
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<z.infer<typeof resetSchema>>({ resolver: zodResolver(resetSchema) });

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const params = new URLSearchParams(window.location.search);
    const accessToken = fragment.get('access_token') ?? params.get('access_token');
    const refreshToken = fragment.get('refresh_token') ?? params.get('refresh_token');
    const code = fragment.get('code') ?? params.get('code');
    void (async () => {
      try {
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          throw new Error('Recovery link is missing or malformed. Request a new one.');
        }
      } catch (error) {
        setLinkError(error instanceof Error ? error.message : String(error));
      } finally {
        setChecked(true);
      }
    })();
  }, []);

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <AnimatedCard className="w-full max-w-md p-8 text-center">
          <ShieldCheck size={48} className="mx-auto mb-4 text-green-400" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-cyan-200 to-purple-200 bg-clip-text text-transparent">Access code re-armed</h1>
          <p className="text-slate-300 mt-4 leading-relaxed">Your new access code is active. Enter the console when ready.</p>
          <Button className="w-full mt-6" onClick={() => router.push('/console')}>
            ENTER CONSOLE <ArrowRight size={16} />
          </Button>
        </AnimatedCard>
      </div>
    );
  }

  return (
    <AuthShell
      eyebrow="Access Recovery"
      headline="Arm New Access Code"
      description="Set a new access code for your identity. The previous code is invalidated immediately."
      footer={<Link href="/login" className="text-cyan-400 hover:text-cyan-300 underline-offset-4 hover:underline">Back to sign in</Link>}
    >
      {!checked ? (
        <div className="flex items-center gap-4 py-6">
          <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          <TypingEffect text="Validating recovery link..." className="text-slate-300" />
        </div>
      ) : linkError ? (
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-red-500/20 border border-red-400/40 text-red-300 text-sm">{linkError}</div>
          <Button asChild variant="outline" className="w-full">
            <Link href="/forgot-password">REQUEST A NEW LINK</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(async values => {
          const { error } = await supabase.auth.updateUser({ password: values.password });
          if (error) setLinkError(error.message);
          else setDone(true);
        })} className="space-y-5">
          <div>
            <label htmlFor="password" className="text-sm text-slate-300 mb-2 block">NEW ACCESS CODE</label>
            <input
              {...register('password')}
              id="password"
              type="password"
              autoComplete="new-password"
              required
              className={inputClass}
              placeholder="At least 8 characters"
            />
            {errors.password && <p className="text-red-400 text-sm mt-2">{errors.password.message}</p>}
          </div>
          <div>
            <label htmlFor="confirm" className="text-sm text-slate-300 mb-2 block">CONFIRM CODE</label>
            <input
              {...register('confirm')}
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              className={inputClass}
              placeholder="Repeat access code"
            />
            {errors.confirm && <p className="text-red-400 text-sm mt-2">{errors.confirm.message}</p>}
          </div>
          {linkError && <div className="p-3 rounded-xl bg-red-500/20 border border-red-400/40 text-red-300 text-sm">{linkError}</div>}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'RE-ARMING...' : 'UPDATE ACCESS CODE'}
            <ArrowRight size={16} />
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
