import {useState} from 'react';
import {View, Text} from 'react-native';
import * as Linking from 'expo-linking';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Button, ErrorNote, Field, Label, Panel, Screen, styles} from '../components/ui';
import {configured, supabase} from '../services/auth';
import {useTheme} from '../theme';
import {API_URL} from '../services/api';
import {useSession} from '../store/session';

const schema = z.object({email: z.string().email('Enter a valid email'), password: z.string().min(8, 'Use at least 8 characters')});
export default function Login() {
  const c = useTheme();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false);
  const [devToken, setDevToken] = useState('');
  const {control, handleSubmit, getValues, formState: {errors}} = useForm<z.infer<typeof schema>>({resolver: zodResolver(schema), defaultValues: {email: '', password: ''}});
  async function submit(values: z.infer<typeof schema>) {
    setBusy(true); setError(''); setNotice('');
    try {
      if (!configured) throw new Error('Configure the Supabase URL and publishable key to sign in. See ENVIRONMENT_SETUP.md.');
      const redirect = Linking.createURL('auth/callback');
      const {error: authError} = mode === 'register'
        ? await supabase.auth.signUp({...values, options: {emailRedirectTo: redirect}})
        : await supabase.auth.signInWithPassword(values);
      if (authError) throw authError;
      if (mode === 'register') setNotice('Check your email to verify your account, then sign in.');
    } catch (e) {setError(e instanceof Error ? e.message : 'Unable to sign in');} finally {setBusy(false);}
  }
  async function reset() {
    const email = getValues('email');
    if (!z.string().email().safeParse(email).success) {setError('Enter your email first.'); return;}
    setBusy(true); setError('');
    try {
      const {error} = await supabase.auth.resetPasswordForEmail(email, {redirectTo: Linking.createURL('auth/callback')});
      if (error) throw error;
      setNotice('If this email has an account, a recovery link is on its way.');
    } catch (e) {setError(String(e));} finally {setBusy(false);}
  }
  return <Screen title="Make room for life." eyebrow="LIFEFLOW AI">
    <View style={{paddingVertical: 24, gap: 12}}><Text style={{fontSize: 52, color: c.primary}}>✳</Text>
      <Label>Organize Life. Automate the Important.</Label><Label muted>Your tasks, documents and deadlines, thoughtfully brought together.</Label></View>
    <Panel><View style={styles.row}><Button title="Sign in" secondary={mode !== 'login'} onPress={() => setMode('login')}/><Button title="Create account" secondary={mode !== 'register'} onPress={() => setMode('register')}/></View>
      <Controller control={control} name="email" render={({field: {value, onChange}}) => <Field label="Email" value={value} onChangeText={onChange} autoCapitalize="none" keyboardType="email-address" autoComplete="email"/>}/>
      <ErrorNote error={errors.email?.message}/>
      <Controller control={control} name="password" render={({field: {value, onChange}}) => <Field label="Password" value={value} onChangeText={onChange} secureTextEntry autoComplete={mode === 'register' ? 'new-password' : 'current-password'}/>}/>
      <ErrorNote error={errors.password?.message || error}/>{Boolean(notice) && <Label>{notice}</Label>}
      <Button title={mode === 'login' ? 'Continue to LifeFlow' : 'Create your account'} pending={busy} onPress={() => void handleSubmit(submit)()}/>
      <Button title="Forgot password?" secondary disabled={busy} onPress={() => void reset()}/></Panel>
    <Label muted>Camera and notification permissions are requested only when you use those features. You control whether AI can process your information.</Label>
    {__DEV__ && process.env.EXPO_PUBLIC_ENABLE_DEV_AUTH === 'true' && <Panel><Label>Local development authentication</Label><Label muted>Paste a short-lived token from the backend dev-token command. This option is excluded from release builds.</Label><Field label="Development token" value={devToken} onChangeText={setDevToken} secureTextEntry/>
      <Button title="Open local development session" pending={busy} onPress={() => {void (async () => {
        setBusy(true); setError('');
        try {
          const response = await fetch(`${API_URL}/api/v1/users/me`, {headers: {Authorization: `Bearer ${devToken}`}});
          const profile = await response.json();
          if (!response.ok || !profile.development) throw new Error('The development backend rejected this token.');
          useSession.getState().setSession({access_token: devToken, refresh_token: '', expires_in: 7200, token_type: 'bearer',
            user: {id: profile.id, email: profile.email, aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: ''}});
        } catch (e) {setError(String(e));} finally {setBusy(false);}
      })();}}/></Panel>}
  </Screen>;
}
