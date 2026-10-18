'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { AnimatedCard, HolographicText, ScanningLine, TypingEffect } from '../cinematic';

export const inputClass = 'w-full px-4 py-3 rounded-xl bg-black/40 backdrop-blur-xl border border-purple-500/40 text-white placeholder-slate-500 focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all duration-300';

interface AuthShellProps {
  eyebrow: string;
  headline: string;
  subline?: boolean;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ eyebrow, headline, subline, description, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <AnimatedCard className="w-full max-w-md p-8">
        <ScanningLine />
        <Link href="/" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400 hover:text-cyan-300 transition-colors mb-6">
          <ArrowLeft size={14} />
          Back to overview
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-[0_0_30px_rgba(168,85,247,0.6)]">
            <Sparkles size={24} className="text-white" />
          </div>
          <HolographicText text="LifeFlow AI" className="text-2xl" />
        </div>
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-purple-300 mb-3">{eyebrow}</p>
          {subline
            ? <TypingEffect text={headline} className="text-2xl font-bold bg-gradient-to-r from-white via-cyan-200 to-purple-200 bg-clip-text text-transparent" speed={60} />
            : <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-cyan-200 to-purple-200 bg-clip-text text-transparent">{headline}</h1>}
          <p className="text-slate-300 mt-4 leading-relaxed">{description}</p>
        </div>
        {children}
        <p className="text-xs text-slate-500 mt-6 text-center">Encrypted channel - Zero-trust architecture - Audited access</p>
        {footer && <div className="mt-4 text-center text-sm text-slate-400">{footer}</div>}
      </AnimatedCard>
    </div>
  );
}
