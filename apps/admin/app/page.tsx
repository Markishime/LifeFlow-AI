'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Activity, ArrowRight, FileText, LayoutDashboard, MailCheck, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  HolographicText,
  AnimatedCard,
  HolographicPanel,
  ParticleButton,
  ScanningLine,
  TypingEffect,
} from '../components/cinematic';
import { useSession } from '../lib/use-session';

const steps = [
  {
    step: '01',
    title: 'Request access',
    body: 'Provision a new operator identity with an email and access code. No credit card, no sales call.',
    icon: Zap,
  },
  {
    step: '02',
    title: 'Verify transmission',
    body: 'Confirm your inbox. The verification link arms your identity and opens the encrypted channel.',
    icon: MailCheck,
  },
  {
    step: '03',
    title: 'Enter the console',
    body: 'Sign in and land in the cinematic operations hub: live metrics, job matrix, audit trail and templates.',
    icon: ShieldCheck,
  },
] as const;

const capabilities = [
  { title: 'Workflow automation', body: 'Trigger and observe autonomous background jobs with one-click requeue on failure.', icon: Zap },
  { title: 'Document intelligence', body: 'AI extraction pipelines that turn raw uploads into structured, queryable records.', icon: FileText },
  { title: 'Live telemetry', body: 'Auto-refreshing metrics on users, documents, tasks and AI token economy.', icon: Activity },
  { title: 'Audited by default', body: 'Every privileged action lands in a chronological, tamper-evident audit trail.', icon: ShieldCheck },
] as const;

function fadeUp(delay: number) {
  return { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.7, delay } };
}

export default function LandingPage() {
  const router = useRouter();
  const { session } = useSession();

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-6 lg:px-12 py-6 backdrop-blur-xl bg-black/20 border-b border-purple-500/20 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-[0_0_30px_rgba(168,85,247,0.6)]">
            <Sparkles size={22} className="text-white" />
          </div>
          <div>
            <HolographicText text="LifeFlow AI" className="text-lg" />
            <p className="text-[10px] text-cyan-400 tracking-[0.3em]">AUTOMATION PLATFORM</p>
          </div>
        </div>
        <nav className="flex items-center gap-3" aria-label="Account">
          {session ? (
            <Button onClick={() => router.push('/console')}>
              ENTER CONSOLE <ArrowRight size={16} />
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm"><Link href="/login">SIGN IN</Link></Button>
              <Button asChild size="sm"><Link href="/signup">CREATE ACCOUNT</Link></Button>
            </>
          )}
        </nav>
      </header>

      <section className="relative px-6 lg:px-12 pt-20 pb-24 max-w-6xl mx-auto text-center">
        <ScanningLine />
        <motion.p {...fadeUp(0)} className="text-xs uppercase tracking-[0.3em] text-purple-300 mb-6">
          Operations console for autonomous work
        </motion.p>
        <motion.div {...fadeUp(0.1)}>
          <HolographicText text="LifeFlow AI" className="text-5xl lg:text-7xl mb-6" />
        </motion.div>
        <motion.div {...fadeUp(0.2)} className="max-w-2xl mx-auto">
          <TypingEffect
            text="Automate the busywork. Observe everything. Answer to no dashboard again."
            className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-white via-cyan-200 to-purple-200 bg-clip-text text-transparent"
            speed={35}
          />
          <p className="text-slate-300 mt-6 leading-relaxed">
            LifeFlow AI runs your document, task and notification workflows in the background — then hands
            you a cinematic console to watch it happen. Provision an access ID and step inside.
          </p>
        </motion.div>
        <motion.div {...fadeUp(0.3)} className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
          {session ? (
            <ParticleButton onClick={() => router.push('/console')}>
              OPEN YOUR CONSOLE <ArrowRight size={18} />
            </ParticleButton>
          ) : (
            <ParticleButton onClick={() => router.push('/signup')}>
              CREATE YOUR ACCESS ID <ArrowRight size={18} />
            </ParticleButton>
          )}
          <Button asChild variant="outline" size="lg"><Link href="/login">I ALREADY HAVE ACCESS</Link></Button>
        </motion.div>
        <motion.div {...fadeUp(0.4)} className="flex items-center justify-center gap-6 mt-10 text-xs text-slate-500 flex-wrap">
          <span className="flex items-center gap-2"><ShieldCheck size={14} className="text-cyan-400" /> Zero-trust authentication</span>
          <span className="flex items-center gap-2"><Activity size={14} className="text-cyan-400" /> Live operational telemetry</span>
          <span className="flex items-center gap-2"><LayoutDashboard size={14} className="text-cyan-400" /> Full audit trail</span>
        </motion.div>
      </section>

      <section className="px-6 lg:px-12 py-20 max-w-6xl mx-auto" aria-labelledby="onboarding-heading">
        <motion.div {...fadeUp(0)} className="text-center mb-12">
          <p className="text-xs uppercase tracking-widest text-cyan-400 mb-3">Onboarding</p>
          <h2 id="onboarding-heading" className="text-white text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-cyan-200 to-purple-200 bg-clip-text text-transparent">
            Three steps to the console
          </h2>
          <p className="text-slate-400 mt-4 max-w-xl mx-auto">
            From zero to a live operations hub in about a minute. Start before you ever sign in.
          </p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((item, idx) => (
            <motion.div key={item.step} {...fadeUp(idx * 0.15)}>
              <HolographicPanel className="h-full">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">{item.step}</span>
                  <item.icon size={26} className="text-cyan-400" />
                </div>
                <h3 className="text-white text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.body}</p>
              </HolographicPanel>
            </motion.div>
          ))}
        </div>
        <motion.div {...fadeUp(0.3)} className="text-center mt-10">
          <Button asChild size="lg"><Link href="/signup">START STEP ONE <ArrowRight size={16} /></Link></Button>
        </motion.div>
      </section>

      <section className="px-6 lg:px-12 py-20 max-w-6xl mx-auto" aria-labelledby="capabilities-heading">
        <motion.div {...fadeUp(0)} className="mb-12">
          <p className="text-xs uppercase tracking-widest text-cyan-400 mb-3">Capabilities</p>
          <h2 id="capabilities-heading" className="text-white text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-cyan-200 to-purple-200 bg-clip-text text-transparent">
            What the console commands
          </h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {capabilities.map((item, idx) => (
            <motion.div key={item.title} {...fadeUp(idx * 0.1)}>
              <AnimatedCard className="p-6 h-full" hover={false}>
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple-600/40 to-indigo-600/40 border border-purple-400/40">
                    <item.icon size={22} className="text-purple-200" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{item.body}</p>
                  </div>
                </div>
              </AnimatedCard>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="px-6 lg:px-12 py-20 max-w-4xl mx-auto text-center">
        <motion.div {...fadeUp(0)}>
          <HolographicPanel>
            <p className="text-xs uppercase tracking-widest text-purple-300 mb-3">Ready to initialize?</p>
            <h2 className="text-white text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white via-cyan-200 to-purple-200 bg-clip-text text-transparent mb-4">
              Your console is one access ID away
            </h2>
            <p className="text-slate-400 mb-8 max-w-lg mx-auto">
              Create an account, verify your inbox, and the operations hub opens immediately. Lost a code? Recovery takes seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {session ? (
                <ParticleButton onClick={() => router.push('/console')}>
                  ENTER CONSOLE <ArrowRight size={18} />
                </ParticleButton>
              ) : (
                <ParticleButton onClick={() => router.push('/signup')}>
                  CREATE ACCOUNT <ArrowRight size={18} />
                </ParticleButton>
              )}
              <Button asChild variant="outline" size="lg"><Link href="/forgot-password">RECOVER ACCESS</Link></Button>
            </div>
          </HolographicPanel>
        </motion.div>
      </section>

      <footer className="px-6 lg:px-12 py-8 border-t border-purple-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 max-w-6xl mx-auto">
        <p>LifeFlow AI - Cinematic operations console</p>
        <div className="flex items-center gap-5">
          <Link href="/login" className="hover:text-cyan-300 transition-colors">Sign in</Link>
          <Link href="/signup" className="hover:text-cyan-300 transition-colors">Create account</Link>
          <Link href="/forgot-password" className="hover:text-cyan-300 transition-colors">Recover access</Link>
        </div>
      </footer>
    </div>
  );
}
