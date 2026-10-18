'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, MailCheck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { AuthShell, inputClass } from '../../components/auth/auth-shell';
import { AnimatedCard } from '../../components/cinematic';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/use-session';

const signupSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters'),
  confirm: z.string().min(8, 'Use at least 8 characters'),
}).refine(values => values.password === values.confirm, { message: 'Passwords do not match', path: ['confirm'] });

export default function SignupPage() {
  const router = useRouter();
  const { session, restored } = useSession();
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<z.infer<typeof signupSchema>>({ resolver: zodResolver(signupSchema) });

  useEffect(() => { if (restored && session) router.replace('/console'); }, [restored, session, router]);

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <AnimatedCard className="w-full max-w-md p-8 text-center">
          <MailCheck size={48} className="mx-auto mb-4 text-cyan-400" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-cyan-200 to-purple-200 bg-clip-text text-transparent">Transmission sent</h1>
          <p className="text-slate-300 mt-4 leading-relaxed">
            Check your inbox to verify your account. Once verified, sign in to enter the operations console.
          </p>
          <Button asChild className="w-full mt-6">
            <Link href="/login">PROCEED TO SIGN IN <ArrowRight size={16} /></Link>
          </Button>
        </AnimatedCard>
      </div>
    );
  }

  return (
    <AuthShell
      eyebrow="New Access ID"
      headline="Request Console Access"
      description="Provision a new administrator identity. A verification transmission will be sent to your inbox before access is granted."
      footer={<>Already provisioned? <Link href="/login" className="text-cyan-400 hover:text-cyan-300 underline-offset-4 hover:underline">Sign in instead</Link></>}
    >
      <form onSubmit={handleSubmit(async values => {
        setError('');
        const { data, error } = await supabase.auth.signUp({ email: values.email, password: values.password, options: { emailRedirectTo: `${window.location.origin}/login` } });
        if (error) setError(error.message);
        else if (data.session) router.push('/console');
        else setSent(true);
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
            placeholder="operator@lifeflow.ai"
          />
          {errors.email && <p className="text-red-400 text-sm mt-2">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="password" className="text-sm text-slate-300 mb-2 block">ACCESS CODE</label>
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
        {error && <div className="p-3 rounded-xl bg-red-500/20 border border-red-400/40 text-red-300 text-sm">{error}</div>}
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'PROVISIONING...' : 'CREATE ACCESS ID'}
          <ArrowRight size={16} />
        </Button>
      </form>
    </AuthShell>
  );
}
