import {useEffect, useState} from 'react';
import * as Linking from 'expo-linking';
import {useRouter} from 'expo-router';
import {Button, ErrorNote, Field, Label, Screen} from '../../components/ui';
import {supabase} from '../../services/auth';

export default function Callback() {
  const url = Linking.useURL(); const router = useRouter();
  const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!url) return;
    const code = Linking.parse(url).queryParams?.code;
    if (typeof code === 'string') {
      void supabase.auth.exchangeCodeForSession(code).then(({error}) => {
        if (error) setError(error.message); else setReady(true);
      });
    } else {setError('This link is incomplete or expired. Return to sign in and request a new link.');}
  }, [url]);
  async function update() {
    if (password.length < 8) {setError('Use at least 8 characters.'); return;}
    const {error} = await supabase.auth.updateUser({password});
    if (error) setError(error.message); else router.replace('/');
  }
  return <Screen title="Your account"><Label>{ready ? 'Your email link has been verified.' : 'Verifying your link…'}</Label>
    <ErrorNote error={error}/>{ready && <><Field label="New password (for account recovery)" value={password} onChangeText={setPassword} secureTextEntry/>
      <Button title="Update password" onPress={() => void update()}/><Button title="Continue without changing password" secondary onPress={() => router.replace('/')}/></>}
    <Button title="Back to sign in" secondary onPress={() => router.replace('/login')}/></Screen>;
}
