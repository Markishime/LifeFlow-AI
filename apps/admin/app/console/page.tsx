'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, ArrowDownToLine, ArrowRight, BookOpen, CircleHelp, LayoutDashboard, LogOut, RefreshCw, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Activity as Audit, Metrics, Page, Profile, Template } from '@lifeflow/api-contracts';
import { Button } from '../../components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HolographicText,
  AnimatedCard,
  ScanningLine,
  TypingEffect,
  AnimatedStat,
  HolographicPanel,
  CountUp
} from '../../components/cinematic';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api';
import { useSession } from '../../lib/use-session';

const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 15000 } } });

function Console({ session }: { session: Session }) {
  const [view, setView] = useState<'overview' | 'failures' | 'audit' | 'templates'>('overview');
  const query = useQueryClient(); const token = session.access_token;
  const profile = useQuery({ queryKey: ['profile', session.user.id], queryFn: () => api<Profile>('/users/me', token) });
  const isAdmin = profile.data?.role === 'admin';
  const metrics = useQuery({ queryKey: ['metrics', session.user.id], queryFn: () => api<Metrics>('/admin/metrics', token), enabled: isAdmin, refetchInterval: 30000 });
  const audit = useQuery({ queryKey: ['audit', session.user.id], queryFn: () => api<Page<Audit & { owner_id: string; resource_id: string | null }>>('/admin/audit', token), enabled: isAdmin && view === 'audit' });
  const templates = useQuery({ queryKey: ['templates'], queryFn: () => api<Page<Template>>('/workflow-templates', token), enabled: isAdmin && view === 'templates' });
  const retry = useMutation({ mutationFn: (id: string) => api(`/admin/jobs/${id}/retry`, token, 'POST'), onSuccess: () => query.invalidateQueries({ queryKey: ['metrics'] }) });
  const data = metrics.data;
  function download() {
    if (!data) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'lifeflow-operations.json'; anchor.click(); URL.revokeObjectURL(url);
  }
  const views = [['overview', LayoutDashboard, 'Overview'], ['failures', TriangleAlert, 'Job failures'], ['audit', ShieldCheck, 'Audit trail'], ['templates', BookOpen, 'Templates']] as const;
  
  return (
    <div className="min-h-screen">
      <div className="flex flex-col lg:flex-row">
        <aside className="lg:w-72 backdrop-blur-2xl bg-gradient-to-br from-slate-900/90 to-black/90 border-b lg:border-b-0 lg:border-r border-purple-500/40 p-6 lg:p-8 flex flex-col gap-8 relative overflow-hidden">
          <ScanningLine />
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-[0_0_30px_rgba(168,85,247,0.7)]">
              <Sparkles size={28} />
            </div>
            <div>
              <HolographicText text="LifeFlow" className="text-xl" />
              <p className="text-xs text-cyan-400 tracking-widest">NEURAL CONSOLE</p>
            </div>
          </div>
          <nav className="flex flex-col gap-2 relative z-10" aria-label="Console sections">
            {views.map(([id, Icon, title], idx) => (
              <motion.button
                key={id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                aria-label={title}
                aria-current={view === id ? 'page' : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${view === id ? 'bg-gradient-to-r from-purple-600/60 to-indigo-600/60 border border-cyan-400/60 text-white shadow-[0_0_20px_rgba(34,211,238,0.5)]' : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent hover:border-purple-400/40'}`}
                onClick={() => setView(id)}
              >
                <Icon size={20} className={view === id ? 'text-cyan-400' : ''} />
                <span className="font-medium">{title}</span>
              </motion.button>
            ))}
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              onClick={() => void supabase.auth.signOut()}
              aria-label="Sign out"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-red-500/20 hover:text-red-300 border border-transparent hover:border-red-400/40 transition-all duration-300 mt-4"
            >
              <LogOut size={20} />
              <span className="font-medium">TERMINATE</span>
            </motion.button>
          </nav>
          <footer className="mt-auto text-xs text-slate-500 space-y-2 relative z-10">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-cyan-400" />
              <span>QUANTUM-SECURED</span>
            </div>
            <p>Restricted operational access</p>
            <p>Private content is excluded</p>
          </footer>
        </aside>
        <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
          <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="mb-10">
            <p className="text-xs uppercase tracking-[0.3em] text-purple-300 mb-4">SYSTEM STATUS</p>
            <HolographicText text={views.find(v => v[0] === view)?.[2] || 'Overview'} className="text-5xl mb-4" />
            <TypingEffect text="Cinematic data visualization for mission-critical operations" className="text-slate-300 text-lg" speed={40} />
            <div className="flex items-center gap-3 mt-6 flex-wrap">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/50">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm text-green-300">{data?.environment || 'SYNCING'}</span>
              </div>
              {metrics.dataUpdatedAt && (
                <div className="px-4 py-2 rounded-full backdrop-blur-xl bg-white/5 border border-purple-400/40 text-sm text-slate-300">
                  Last sync: {new Date(metrics.dataUpdatedAt).toLocaleTimeString()}
                </div>
              )}
            </div>
          </motion.header>
          <AnimatePresence>
            {(profile.error || metrics.error || audit.error || retry.error) && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-400/50 text-red-300 backdrop-blur-xl">
                {(profile.error || metrics.error || audit.error || retry.error)?.message}
              </motion.div>
            )}
          </AnimatePresence>
          {profile.data && !isAdmin && (
            <AnimatedCard className="p-6 mb-6">
              <div className="flex items-center gap-3 text-red-300">
                <TriangleAlert size={24} />
                <p>Administrator access required. Contact system operator.</p>
              </div>
            </AnimatedCard>
          )}
          {isAdmin && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <p className="text-slate-400">Auto-refresh: 30s - Real-time telemetry active</p>
                <Button variant="outline" onClick={() => void metrics.refetch()} disabled={metrics.isFetching}>
                  <RefreshCw size={16} className={metrics.isFetching ? 'animate-spin' : ''} />
                  {metrics.isFetching ? 'SYNCING...' : 'MANUAL SYNC'}
                </Button>
              </div>
              {metrics.isLoading && (
                <AnimatedCard className="p-12 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    <TypingEffect text="Initializing quantum data streams..." className="text-slate-300" />
                  </div>
                </AnimatedCard>
              )}
              {data && view === 'overview' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <AnimatedStat title="Registered Users" count={data.totals.users} delay={0.1} icon={<Activity size={18} />} />
                    <AnimatedStat title="Documents" count={data.totals.documents} delay={0.2} icon={<BookOpen size={18} />} />
                    <AnimatedStat title="Tasks Created" count={data.totals.tasks} delay={0.3} icon={<LayoutDashboard size={18} />} />
                    <AnimatedStat title="Active Subscriptions" count={data.active_subscriptions} delay={0.4} icon={<Sparkles size={18} />} />
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <HolographicPanel delay={0.5} className="h-[380px]">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <p className="text-xs uppercase tracking-widest text-cyan-400 mb-2">SYSTEM ACTIVITY</p>
                          <h2 className="text-white">Module Distribution</h2>
                          <p className="text-slate-400 mt-1">Persisted records across architecture</p>
                        </div>
                        <Activity size={22} className="text-cyan-400" />
                      </div>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={Object.entries(data.totals).map(([name, count]) => ({ name: name.replace('notification_', '').toUpperCase(), count }))} margin={{ left: -20, top: 10, right: 10, bottom: 10 }}>
                            <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                            <YAxis allowDecimals={false} fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                            <Tooltip cursor={{ fill: 'rgba(168,85,247,0.2)' }} contentStyle={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(168,85,247,0.5)', borderRadius: '12px', color: '#fff' }} />
                            <Bar dataKey="count" fill="url(#gradient)" radius={[6, 6, 0, 0]} maxBarSize={36} />
                            <defs>
                              <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#a78bfa" />
                                <stop offset="100%" stopColor="#22d3ee" />
                              </linearGradient>
                            </defs>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </HolographicPanel>
                    <HolographicPanel delay={0.6} className="space-y-6">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-cyan-400 mb-2">AI RESOURCE MATRIX</p>
                        <h2 className="text-white mb-2">Token Economy</h2>
                        <p className="text-slate-400">Quantum-precise consumption tracking</p>
                      </div>
                      <div className="space-y-6">
                        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-900/40 to-black/60 border border-purple-500/40">
                          <small className="text-purple-300 uppercase tracking-widest text-xs">Tokens Processed</small>
                          <p className="text-4xl font-bold mt-2 bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent"><CountUp end={data.ai_tokens} /></p>
                        </div>
                        <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-900/30 to-black/60 border border-cyan-400/40">
                          <small className="text-cyan-300 uppercase tracking-widest text-xs">Estimated Cost</small>
                          <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">${data.ai_estimated_cost.toFixed(4)}</p>
                          <p className="text-xs text-slate-500 mt-2">Provider billing may differ</p>
                        </div>
                      </div>
                      <Button variant="outline" onClick={download} className="w-full">
                        <ArrowDownToLine size={16} />
                        EXPORT NEURAL SNAPSHOT
                      </Button>
                    </HolographicPanel>
                  </div>
                  <AnimatedCard className="p-6" delay={0.7}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-cyan-400 mb-2">JOB MATRIX</p>
                        <h2 className="text-white">Background Processes</h2>
                        <p className="text-slate-400 mt-2">{data.job_failures.length === 0 ? 'All background operations optimal' : `${data.job_failures.length} anomalies detected - require intervention`}</p>
                      </div>
                      <Button variant="outline" onClick={() => setView('failures')}>
                        SCAN QUEUE
                        <ArrowRight size={16} />
                      </Button>
                    </div>
                  </AnimatedCard>
                  <div className="flex items-start gap-3 text-slate-500 text-sm">
                    <CircleHelp size={18} className="mt-0.5 flex-shrink-0" />
                    <p>Telemetry sourced from application database. Push receipts do not confirm user visibility.</p>
                  </div>
                </div>
              )}
              {data && view === 'failures' && (
                <HolographicPanel delay={0.2}>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-red-400 mb-2">ANOMALY DETECTION</p>
                      <h2 className="text-white">Jobs Requiring Intervention</h2>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-purple-500/30">
                          <th className="text-left py-3 px-4 text-xs uppercase tracking-widest text-slate-400">JOB ID</th>
                          <th className="text-left py-3 px-4 text-xs uppercase tracking-widest text-slate-400">TYPE</th>
                          <th className="text-left py-3 px-4 text-xs uppercase tracking-widest text-slate-400">STATUS</th>
                          <th className="text-left py-3 px-4 text-xs uppercase tracking-widest text-slate-400">ATTEMPTS</th>
                          <th className="text-left py-3 px-4 text-xs uppercase tracking-widest text-slate-400">ERROR</th>
                          <th className="text-left py-3 px-4 text-xs uppercase tracking-widest text-slate-400">ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.job_failures.map((job) => (
                          <tr key={job.id} className="border-b border-purple-500/20 hover:bg-white/5 transition-colors">
                            <td className="py-4 px-4"><code className="text-cyan-400 text-sm">{job.id.slice(0, 8)}</code></td>
                            <td className="py-4 px-4 text-slate-300">{job.kind}</td>
                            <td className="py-4 px-4"><span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-300 border border-red-400/40">{job.status}</span></td>
                            <td className="py-4 px-4 text-slate-300">{job.attempts}</td>
                            <td className="py-4 px-4 text-slate-400 text-sm">{job.error_code || 'Inspect provider state'}</td>
                            <td className="py-4 px-4">
                              {job.status === 'failed' && job.kind !== 'notification' ? (
                                <Button variant="outline" size="sm" disabled={retry.isPending} onClick={() => retry.mutate(job.id)}>
                                  {retry.isPending ? 'RETRYING...' : 'REQUEUE'}
                                </Button>
                              ) : (
                                <span className="text-slate-500 text-sm">OPERATOR REVIEW</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {data.job_failures.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <ShieldCheck size={48} className="mx-auto mb-4 text-green-400" />
                      <p>No anomalies detected. System nominal.</p>
                    </div>
                  )}
                </HolographicPanel>
              )}
              {view === 'audit' && (
                <HolographicPanel delay={0.2}>
                  <div className="mb-6">
                    <p className="text-xs uppercase tracking-widest text-cyan-400 mb-2">AUDIT TRAIL</p>
                    <h2 className="text-white">Chrono-Encrypted Events</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-purple-500/30">
                          <th className="text-left py-3 px-4 text-xs uppercase tracking-widest text-slate-400">TIMESTAMP</th>
                          <th className="text-left py-3 px-4 text-xs uppercase tracking-widest text-slate-400">ACTION</th>
                          <th className="text-left py-3 px-4 text-xs uppercase tracking-widest text-slate-400">ACTOR</th>
                          <th className="text-left py-3 px-4 text-xs uppercase tracking-widest text-slate-400">RESOURCE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {audit.data?.items.map(row => (
                          <tr key={row.id} className="border-b border-purple-500/20 hover:bg-white/5 transition-colors">
                            <td className="py-4 px-4 text-slate-300 text-sm">{new Date(row.created_at).toLocaleString()}</td>
                            <td className="py-4 px-4"><span className="px-2 py-1 rounded-full text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">{row.action}</span></td>
                            <td className="py-4 px-4"><code className="text-purple-300 text-sm">{row.owner_id.slice(0, 8)}</code></td>
                            <td className="py-4 px-4"><code className="text-slate-400 text-sm">{row.resource_id?.slice(0, 8) || '—'}</code></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </HolographicPanel>
              )}
              {view === 'templates' && (
                <HolographicPanel delay={0.2}>
                  <div className="mb-6">
                    <p className="text-xs uppercase tracking-widest text-cyan-400 mb-2">TEMPLATE LIBRARY</p>
                    <h2 className="text-white">Workflow Archetypes</h2>
                    <p className="text-slate-400 mt-2">Versioned neural templates - verification status indicated</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-purple-500/30">
                          <th className="text-left py-3 px-4 text-xs uppercase tracking-widest text-slate-400">TEMPLATE</th>
                          <th className="text-left py-3 px-4 text-xs uppercase tracking-widest text-slate-400">VERIFICATION</th>
                          <th className="text-left py-3 px-4 text-xs uppercase tracking-widest text-slate-400">GUIDANCE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {templates.data?.items.map(row => (
                          <tr key={row.id} className="border-b border-purple-500/20 hover:bg-white/5 transition-colors">
                            <td className="py-4 px-4 text-slate-200 font-medium">{row.title}</td>
                            <td className="py-4 px-4"><span className={`px-2 py-1 rounded-full text-xs border ${row.verified_at ? 'bg-green-500/20 text-green-300 border-green-400/40' : 'bg-yellow-500/20 text-yellow-300 border-yellow-400/40'}`}>{row.verified_at ? 'VERIFIED' : 'UNVERIFIED'}</span></td>
                            <td className="py-4 px-4 text-slate-400 text-sm">{row.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </HolographicPanel>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function ConsoleGate() {
  const router = useRouter();
  const { session, restored } = useSession();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => { client.clear(); });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (restored && !session) router.replace('/login'); }, [restored, session, router]);

  if (!restored || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AnimatedCard className="p-8">
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            <TypingEffect text="Establishing neural link..." className="text-slate-300" />
          </div>
        </AnimatedCard>
      </div>
    );
  }
  return <Console session={session} />;
}

export default function ConsolePage() {
  return <QueryClientProvider client={client}><ConsoleGate /></QueryClientProvider>;
}
