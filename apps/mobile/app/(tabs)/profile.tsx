import {useState} from 'react';
import {Platform, Switch, View} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Localization from 'expo-localization';
import Constants from 'expo-constants';
import {useQueryClient} from '@tanstack/react-query';
import type {Profile} from '@lifeflow/api-contracts';
import {Button, ErrorNote, Field, Label, Loading, Panel, Screen, Section, styles} from '../../components/ui';
import {useAction, useData} from '../../hooks/data';
import {supabase} from '../../services/auth';
import {post, request} from '../../services/api';
import {useSession} from '../../store/session';
import {clearCache} from '../../services/cache';

export default function ProfileScreen() {
  const profile = useData<Profile>('/users/me'); const action = useAction(); const query = useQueryClient();
  const [name, setName] = useState<string>(); const [zone, setZone] = useState<string>(); const [language, setLanguage] = useState<'en' | 'fil'>();
  const [ai, setAi] = useState<boolean>(); const [notice, setNotice] = useState(''); const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false); const {theme, setTheme, deviceId, setDevice, setSession} = useSession();
  const data = profile.data;
  async function notifications() {
    setError('');
    try {
      if (Platform.OS === 'web') throw new Error('Push registration requires an Android or iOS development build.');
      const permission = await Notifications.requestPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('Notifications are disabled. You can enable them later in device settings.');
      if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('default', {name: 'Reminders', importance: Notifications.AndroidImportance.DEFAULT});
      const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
      if (!projectId) throw new Error('Set the EAS project ID before registering push notifications.');
      const token = await Notifications.getExpoPushTokenAsync({projectId});
      const device = await post<{id: string}>('/notifications/devices', {token: token.data, platform: Platform.OS});
      setDevice(device.id);
      if (data) await request('/users/me', {method: 'PATCH', body: JSON.stringify({name: data.name, notifications: true,
        // Only send the editable preference fields.
        language: data.preferences.language, timezone: data.preferences.timezone, consent: data.preferences.consent})});
      await query.invalidateQueries(); setNotice('This device is registered. Delivery depends on connectivity and the platform.');
    } catch (e) {setError(e instanceof Error ? e.message : String(e));}
  }
  async function signOut() {
    try {
      if (deviceId) {await request(`/notifications/devices/${deviceId}`, {method: 'DELETE'}); setDevice(null);}
      const {error} = await supabase.auth.signOut(); if (error) throw error;
      query.clear(); await clearCache(); setSession(null);
    } catch (e) {setError(String(e));}
  }
  return <Screen title="A space that's yours" eyebrow="Profile & preferences"><ErrorNote error={profile.error || action.error || error}/>{profile.isLoading && <Loading/>}
    {data && <><Panel><Label>{data.email}</Label><Label muted>{data.plan} plan{data.development ? ' · development environment' : ''}</Label></Panel>
      <Field label="Your name" value={name ?? data.name} onChangeText={setName}/>
      <Field label="Timezone (IANA)" value={zone ?? data.preferences.timezone} onChangeText={setZone}/>
      <Button title={`Use device timezone (${Localization.getCalendars()[0]?.timeZone || 'Asia/Manila'})`} secondary onPress={() => setZone(Localization.getCalendars()[0]?.timeZone || 'Asia/Manila')}/>
      <View style={styles.row}><Button title="English" secondary={(language ?? data.preferences.language) !== 'en'} onPress={() => setLanguage('en')}/><Button title="Filipino" secondary={(language ?? data.preferences.language) !== 'fil'} onPress={() => setLanguage('fil')}/></View>
      <View style={styles.row}><View style={{flex: 1}}><Label>Allow AI processing</Label><Label muted>Send authorized task and document context to the configured AI provider when using AI features.</Label></View><Switch accessibilityLabel="Allow AI processing" value={ai ?? data.preferences.consent.ai_processing ?? false} onValueChange={setAi}/></View>
      <Button title="Save preferences" pending={action.isPending} onPress={() => action.mutate({path: '/users/me', method: 'PATCH', data: {
        name: name ?? data.name, timezone: zone ?? data.preferences.timezone, language: language ?? data.preferences.language,
        notifications: data.preferences.notifications, consent: {...data.preferences.consent, ai_processing: ai ?? data.preferences.consent.ai_processing ?? false},
      }}, {onSuccess: () => setNotice('Preferences saved.')} )}/>
      {Boolean(notice) && <Label>{notice}</Label>}<Section title="Appearance"><View style={styles.row}>{(['system', 'light', 'dark'] as const).map(value => <Button key={value} title={value} secondary={theme !== value} onPress={() => setTheme(value)}/>)}</View></Section>
      <Section title="Notifications"><Button title="Enable reminders on this device" secondary onPress={() => void notifications()}/>
        <Button title="Disable all push notifications" secondary pending={action.isPending} onPress={() => action.mutate({path: '/users/me', method: 'PATCH', data: {
          name: data.name, language: data.preferences.language, timezone: data.preferences.timezone, consent: data.preferences.consent, notifications: false,
        }})}/></Section>
      <Button title="Sign out" secondary onPress={() => void signOut()}/>
      {confirm ? <Panel><Label>Request permanent account deletion?</Label><Label muted>Access is blocked immediately. A background job removes originals, application records and the managed authentication account. This cannot be undone.</Label>
        <Button title="Request permanent deletion" danger pending={action.isPending} onPress={() => action.mutate({path: '/users/me', method: 'DELETE'}, {onSuccess: () => {void supabase.auth.signOut({scope: 'local'}); query.clear(); void clearCache(); setSession(null);}})}/><Button title="Keep my account" secondary onPress={() => setConfirm(false)}/></Panel> : <Button title="Delete account" secondary onPress={() => setConfirm(true)}/>}</>}
  </Screen>;
}
