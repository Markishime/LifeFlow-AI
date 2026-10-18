import {useEffect} from 'react';
import {Pressable, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import type {Dashboard, Profile} from '@lifeflow/api-contracts';
import {Button, Empty, ErrorNote, Label, Loading, Panel, Screen, Section, styles} from '../../components/ui';
import {TaskRow} from '../../components/task-row';
import {useAction, useData} from '../../hooks/data';
import {useTheme} from '../../theme';
import {messages} from '../../services/i18n';
import {cacheSummary} from '../../services/cache';

export default function Home() {
  const router = useRouter(); const c = useTheme(); const profile = useData<Profile>('/users/me');
  const data = useData<Dashboard>('/dashboard'); const action = useAction();
  const t = messages[profile.data?.preferences.language || 'en'];
  useEffect(() => {
    if (profile.data && data.data) void cacheSummary(profile.data.id, {active: data.data.active_tasks, overdue: data.data.overdue});
  }, [profile.data, data.data]);
  const quick = [['Scan document', 'scan-outline', '/scan'], ['Add task', 'add-outline', '/task/new'], ['Ask LifeFlow', 'sparkles-outline', '/assistant']] as const;
  return <Screen title={profile.data?.name ? `Hello, ${profile.data.name.split(' ')[0]}.` : 'Hello, there.'}
    eyebrow={new Date().toLocaleDateString(profile.data?.preferences.language === 'fil' ? 'fil-PH' : 'en-PH', {weekday: 'long', month: 'long', day: 'numeric', timeZone: profile.data?.preferences.timezone || 'Asia/Manila'})}
    right={<Pressable accessibilityRole="button" accessibilityLabel="Reminder history" onPress={() => router.push('/reminders')} style={{padding: 12}}><Ionicons name="notifications-outline" size={24} color={c.text}/></Pressable>}>
    <Label muted>{t.welcome}</Label>
    {profile.data && !profile.data.name && <Panel><Label>Make LifeFlow yours.</Label><Label muted>Choose your name, language and timezone to get started.</Label><Button title="Set up your preferences" onPress={() => router.push('/profile')}/></Panel>}
    <View style={{backgroundColor: c.tint, padding: 24, borderRadius: 24, gap: 14}}><View style={styles.row}><Ionicons name="sunny-outline" size={22} color={c.primary}/><Text style={{fontSize: 13, fontWeight: '700', color: c.primary}}>{t.briefing}</Text></View>
      <Text style={{fontSize: 22, lineHeight: 32, fontWeight: '600', color: c.text}}>{data.data?.briefing || 'Your responsibilities, in one calm place.'}</Text>
      {Boolean(data.data?.pending_approvals) && <Button title={`Review ${data.data?.pending_approvals} proposed actions`} secondary onPress={() => router.push('/assistant')}/>}</View>
    <View style={{flexDirection: 'row', gap: 10}}>{quick.map(([title, icon, route]) => <Pressable key={route} accessibilityRole="button" accessibilityLabel={title} onPress={() => router.push(route)}
      style={({pressed}) => ({flex: 1, padding: 16, gap: 10, borderRadius: 18, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, opacity: pressed ? 0.7 : 1})}>
      <Ionicons name={icon} size={24} color={c.primary}/><Text style={{fontSize: 13, fontWeight: '600', color: c.text}}>{title}</Text></Pressable>)}</View>
    <ErrorNote error={data.error || action.error}/>{data.isLoading && <Loading/>}
    {data.isError && <Button title="Try again" secondary onPress={() => void data.refetch()}/>}
    <Section title={t.priorities}>{data.data?.priorities.map(task => <TaskRow key={task.id} task={task} onComplete={() => action.mutate({path: `/tasks/${task.id}`, method: 'PATCH', data: {status: 'completed'}})}/>)}
      {data.data?.priorities.length === 0 && <Empty text={t.noTasks}/>}<Button title="View all tasks" secondary onPress={() => router.push('/tasks')}/></Section>
    <Section title="Life, a little more organized"><View style={styles.row}>
      {([['Workflows', '/workflows'], ['Bills & renewals', '/obligations'], ['Household', '/household'], ['Follow-ups', '/follow-ups'], ['Calendar', '/calendar'], ['Reminders', '/reminders']] as const).map(([title, route]) => <Button key={route} title={title} secondary onPress={() => router.push(route)}/>)}</View></Section>
    {Boolean(data.data?.documents.length) && <Section title="Recently added">{data.data?.documents.map(doc => <Pressable key={doc.id} accessibilityRole="button" onPress={() => router.push(`/document/${doc.id}`)}><Panel><Label>{doc.title}</Label><Label muted>{doc.status.replaceAll('_', ' ')}</Label></Panel></Pressable>)}</Section>}
    {Boolean(data.data?.activity.length) && <Section title="A record of what happened">{data.data?.activity.slice(0, 5).map(item => <Label key={item.id} muted>{item.action.replaceAll('.', ' · ')} · {new Date(item.created_at).toLocaleDateString()}</Label>)}</Section>}
  </Screen>;
}
