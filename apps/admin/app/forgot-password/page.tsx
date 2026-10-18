'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, MailCheck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { AuthShell, inputClass } from '../../components/auth/auth-shell';
import { AnimatedCard } from '../../components/cinematic';
import { supabase } from '../../lib/supabase';

const forgotSchema = z.object({ email: z.string().email('Enter a valid email') });

export default function ForgotPasswordPage() {
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<z.infer<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema) });

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <AnimatedCard className="w-full max-w-md p-8 text-center">
          <MailCheck size={48} className="mx-auto mb-4 text-cyan-400" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-cyan-200 to-purple-200 bg-clip-text text-transparent">Recovery link dispatched</h1>
          <p className="text-slate-300 mt-4 leading-relaxed">
            If this email has an account, a recovery link is on its way. Open it to set a new access code.
          </p>
          <Button asChild variant="outline" className="w-full mt-6">
            <Link href="/login">RETURN TO SIGN IN</Link>
          </Button>
        </AnimatedCard>
      </div>
    );
  }

  return (
    <AuthShell
      eyebrow="Access Recovery"
      headline="Reset Your Access Code"
      description="Enter the email tied to your identity and we will transmit a secure recovery link. The code expires shortly after dispatch."
      footer={<>Remembered it? <Link href="/login" className="text-cyan-400 hover:text-cyan-300 underline-offset-4 hover:underline">Back to sign in</Link></>}
    >
      <form onSubmit={handleSubmit(async values => {
        setError('');
        const { error } = await supabase.auth.resetPasswordForEmail(values.email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) setError(error.message);
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
        {error && <div className="p-3 rounded-xl bg-red-500/20 border border-red-400/40 text-red-300 text-sm">{error}</div>}
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'TRANSMITTING...' : 'SEND RECOVERY LINK'}
          <ArrowRight size={16} />
        </Button>
      </form>
    </AuthShell>
  );
}
