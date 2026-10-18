'use client';

import {useEffect, useState} from 'react';
import {createClient, type Session} from '@supabase/supabase-js';
import {QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Activity, ArrowDownToLine, ArrowRight, BookOpen, CircleHelp, LayoutDashboard, LogOut, RefreshCw, ShieldCheck, Sparkles, TriangleAlert} from 'lucide-react';
import {BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer} from 'recharts';
import type {Activity as Audit, Metrics, Page, Profile, Template} from '@lifeflow/api-contracts';
import {Button} from '../components/ui/button';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://unconfigured.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'unconfigured', {auth: {persistSession: false}});
const client = new QueryClient({defaultOptions: {queries: {retry: false, staleTime: 15000}}});
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const loginSchema = z.object({email: z.string().email(), password: z.string().min(8)});

async function api<T>(path: string, token: string, method = 'GET'): Promise<T> {
  const response = await fetch(`${API}/api/v1${path}`, {method, headers: {Authorization: `Bearer ${token}`}, signal: AbortSignal.timeout(15000)});
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Request failed');
  return data;
}

function Login({onLocal}: {onLocal: (session: Session) => void}) {
  const [error, setError] = useState('');
  const [devToken, setDevToken] = useState('');
  const {register, handleSubmit, formState: {isSubmitting, errors}} = useForm<z.infer<typeof loginSchema>>({resolver: zodResolver(loginSchema)});
  return <div className="login"><div className="brand"><Sparkles size={28}/>LifeFlow <small>AI</small></div>
    <div><p className="eyebrow">Operations console</p><h1>A clear view of the system.</h1><p className="muted" style={{marginTop: 14}}>Sign in with an account granted the administrator role by an operator.</p></div>
    <form onSubmit={handleSubmit(async values => {
      setError(''); const {error} = await supabase.auth.signInWithPassword(values); if (error) setError(error.message);
    })}><label>Email<input {...register('email')} type="email" autoComplete="username" required/></label>
      {errors.email && <p role="alert">Enter a valid email.</p>}<label>Password<input {...register('password')} type="password" autoComplete="current-password" required/></label>
      {errors.password && <p role="alert">Use at least 8 characters.</p>}{error && <p className="error" role="alert">{error}</p>}
      <Button disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Continue'}<ArrowRight size={16}/></Button></form>
    <small>Private documents stay private. This console displays operational metadata and audited events.</small>
    {process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true' && <form onSubmit={event => {event.preventDefault(); void (async () => {
      try {
        const profile = await api<Profile>('/users/me', devToken);
        if (!profile.development) throw new Error('Development authentication is unavailable.');
        onLocal({access_token: devToken, refresh_token: '', expires_in: 7200, token_type: 'bearer', user: {
          id: profile.id, email: profile.email, aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '',
        }});
      } catch (error) {setError(String(error));}
    })();}}><label>Local development token<input value={devToken} onChange={event => setDevToken(event.target.value)} type="password"/></label><Button>Open local session</Button></form>}</div>;
}

function Console({session}: {session: Session}) {
  const [view, setView] = useState<'overview' | 'failures' | 'audit' | 'templates'>('overview');
  const query = useQueryClient(); const token = session.access_token;
  const profile = useQuery({queryKey: ['profile', session.user.id], queryFn: () => api<Profile>('/users/me', token)});
  const isAdmin = profile.data?.role === 'admin';
  const metrics = useQuery({queryKey: ['metrics', session.user.id], queryFn: () => api<Metrics>('/admin/metrics', token), enabled: isAdmin, refetchInterval: 30000});
  const audit = useQuery({queryKey: ['audit', session.user.id], queryFn: () => api<Page<Audit & {owner_id: string; resource_id: string | null}>>('/admin/audit', token), enabled: isAdmin && view === 'audit'});
  const templates = useQuery({queryKey: ['templates'], queryFn: () => api<Page<Template>>('/workflow-templates', token), enabled: isAdmin && view === 'templates'});
  const retry = useMutation({mutationFn: (id: string) => api(`/admin/jobs/${id}/retry`, token, 'POST'), onSuccess: () => query.invalidateQueries({queryKey: ['metrics']})});
  const data = metrics.data;
  function download() {
    if (!data) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'lifeflow-operations.json'; anchor.click(); URL.revokeObjectURL(url);
  }
  const views = [['overview', LayoutDashboard, 'Overview'], ['failures', TriangleAlert, 'Job failures'], ['audit', ShieldCheck, 'Audit trail'], ['templates', BookOpen, 'Templates']] as const;
  return <div className="shell"><aside><div className="brand"><Sparkles size={27}/><span>LifeFlow<small> AI</small></span></div><nav aria-label="Console sections">
    {views.map(([id, Icon, title]) => <button key={id} aria-label={title} aria-current={view === id ? 'page' : undefined} className={view === id ? 'active' : ''} onClick={() => setView(id)}><Icon size={19}/><span>{title}</span></button>)}
    <button onClick={() => void supabase.auth.signOut()} aria-label="Sign out"><LogOut size={19}/><span>Sign out</span></button></nav>
    <footer><ShieldCheck size={20}/><p>Restricted operational access</p><p>Private content is excluded.</p></footer></aside>
    <main><header className="topline"><div><p className="eyebrow">Workspace / Operations</p><h1>{views.find(v => v[0] === view)?.[2]}</h1><p className="muted" style={{marginTop: 10}}>The details that keep everyday life running.</p></div>
      <div className="status"><i/>{data?.environment || 'Connecting'}</div></header>
      {(profile.error || metrics.error || audit.error || retry.error) && <div className="error" role="alert">{(profile.error || metrics.error || audit.error || retry.error)?.message}</div>}
      {profile.data && !isAdmin && <div className="error" role="alert">Your account does not have administrator access. An operator must grant it using the server management command.</div>}
      {isAdmin && <><div className="panel-heading"><p className="muted">Updated {metrics.dataUpdatedAt ? new Date(metrics.dataUpdatedAt).toLocaleTimeString() : 'when connected'}. Refreshes every 30 seconds.</p><Button variant="outline" onClick={() => void metrics.refetch()} disabled={metrics.isFetching}><RefreshCw size={15}/>Refresh</Button></div>
        {metrics.isLoading && <div className="skeleton" aria-label="Loading operational data"/>}
        {data && view === 'overview' && <><div className="stats">{[['Registered users', data.totals.users], ['Documents uploaded', data.totals.documents], ['Tasks created', data.totals.tasks], ['Active subscriptions', data.active_subscriptions]].map(([title, count]) => <div className="stat" key={title}><small>{title}</small><strong>{Number(count).toLocaleString()}</strong></div>)}</div>
          <div className="columns"><section className="panel"><div className="panel-heading"><div><h2>Activity across the system</h2><p className="muted">Persisted records by module</p></div><Activity size={20} className="dot"/></div>
            <div style={{height: 260, minWidth: 0}}><ResponsiveContainer width="100%" height="100%"><BarChart data={Object.entries(data.totals).map(([name, count]) => ({name: name.replace('notification_', ''), count}))} margin={{left: -20, top: 10}}>
              <XAxis dataKey="name" fontSize={11} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} fontSize={11} axisLine={false} tickLine={false}/><Tooltip cursor={{fill: 'var(--tint)'}}/><Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={34}/></BarChart></ResponsiveContainer></div></section>
            <section className="panel spaced"><div><p className="eyebrow">AI resource use</p><h2>Usage you can account for.</h2></div><div><small>Tokens processed</small><p style={{fontSize: 28, fontWeight: 650}}>{data.ai_tokens.toLocaleString()}</p></div><div><small>Estimated provider cost</small><p style={{fontSize: 24, fontWeight: 600}}>${data.ai_estimated_cost.toFixed(4)}</p><small>Based on configured rates. Confirm against provider billing.</small></div><Button variant="outline" onClick={download}><ArrowDownToLine size={15}/>Export snapshot</Button></section></div>
          <section className="panel"><div className="panel-heading"><div><h2>Background jobs</h2><p className="muted">Failures and ambiguous outcomes that need attention</p></div><Button variant="outline" onClick={() => setView('failures')}>View queue<ArrowRight size={15}/></Button></div>
            {data.job_failures.length === 0 ? <div className="empty">No failed jobs recorded.</div> : <p>{data.job_failures.length} jobs need review. Open the queue to inspect failure codes.</p>}</section>
          <div style={{display: 'flex', gap: 10, alignItems: 'start', color: 'var(--muted)', fontSize: 13}}><CircleHelp size={18}/><p>Counts come from the application database. Push acceptance and delivery receipts have separate states; they do not confirm that a user saw a reminder.</p></div></>}
        {data && view === 'failures' && <section className="panel"><h2>Jobs needing attention</h2><div className="table-wrap"><table><thead><tr><th>Job</th><th>Type</th><th>Status</th><th>Attempts</th><th>Failure code</th><th>Action</th></tr></thead><tbody>{data.job_failures.map(job => <tr key={job.id}><td><code>{job.id.slice(0, 8)}</code></td><td>{job.kind}</td><td>{job.status}</td><td>{job.attempts}</td><td>{job.error_code || 'Inspect provider state'}</td><td>{job.status === 'failed' && job.kind !== 'notification' ? <Button variant="outline" disabled={retry.isPending} onClick={() => retry.mutate(job.id)}>Retry</Button> : 'Operator review'}</td></tr>)}</tbody></table></div>{data.job_failures.length === 0 && <p className="empty">No failed jobs recorded.</p>}</section>}
        {view === 'audit' && <section className="panel"><h2>Audited activity</h2><div className="table-wrap"><table><thead><tr><th>When</th><th>Action</th><th>Actor ID</th><th>Resource ID</th></tr></thead><tbody>{audit.data?.items.map(row => <tr key={row.id}><td>{new Date(row.created_at).toLocaleString()}</td><td>{row.action}</td><td><code>{row.owner_id.slice(0, 8)}</code></td><td><code>{row.resource_id?.slice(0, 8) || '—'}</code></td></tr>)}</tbody></table></div></section>}
        {view === 'templates' && <section className="panel"><h2>Workflow template catalog</h2><p className="muted">Versioned in the backend seed catalog. Regulatory requirements have not been verified.</p><div className="table-wrap"><table><thead><tr><th>Template</th><th>Verification</th><th>Guidance</th></tr></thead><tbody>{templates.data?.items.map(row => <tr key={row.id}><td>{row.title}</td><td>{row.verified_at || 'Unverified'}</td><td>{row.description}</td></tr>)}</tbody></table></div></section>}</>}
    </main></div>;
}

function App() {
  const [session, setSession] = useState<Session | null>(null); const [restored, setRestored] = useState(false);
  useEffect(() => {
    void supabase.auth.getSession().then(({data}) => {setSession(data.session); setRestored(true);});
    const {data} = supabase.auth.onAuthStateChange((_event, next) => {client.clear(); setSession(next); setRestored(true);});
    return () => data.subscription.unsubscribe();
  }, []);
  if (!restored) return <main><div className="skeleton" aria-label="Restoring session"/></main>;
  return session ? <Console session={session}/> : <Login onLocal={setSession}/>;
}
export default function Page() {return <QueryClientProvider client={client}><App/></QueryClientProvider>;}
