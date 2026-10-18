import {useState} from 'react';
import {useRouter} from 'expo-router';
import type {Delivery, Page, Reminder} from '@lifeflow/api-contracts';
import {Button, Empty, ErrorNote, Field, Label, Panel, Screen, Section, styles} from '../components/ui';
import {View} from 'react-native';
import {useAction, useData} from '../hooks/data';
import {DateField} from '../components/date-field';

export default function Reminders() {
  const router = useRouter(); const reminders = useData<Page<Reminder>>('/reminders', true);
  const history = useData<Page<Delivery>>('/notifications/history', true); const action = useAction();
  const [title, setTitle] = useState(''); const [date, setDate] = useState('');
  return <Screen title="A timely nudge" eyebrow="Reminders"><Field label="Reminder title" value={title} onChangeText={setTitle}/><DateField label="When" value={date} onChangeText={setDate}/>
    <Button title="Create reminder" pending={action.isPending} disabled={!title.trim() || !date.trim()} onPress={() => action.mutate({path: '/reminders', data: {title, fire_at: date}}, {onSuccess: () => {setTitle(''); setDate('');}})}/>
    <ErrorNote error={reminders.error || history.error || action.error}/><Section title="Scheduled & recent">{reminders.data?.items.map(item => <Panel key={item.id}><Label>{item.title}</Label><Label muted>{new Date(item.fire_at).toLocaleString(undefined, {timeZone: item.timezone})} · {item.status}</Label>
      <View style={styles.row}><Button title="Snooze 1 hour" secondary pending={action.isPending} onPress={() => action.mutate({path: `/reminders/${item.id}`, method: 'PATCH', data: {fire_at: new Date(Date.now() + 3600000).toISOString()}})}/>
        <Button title="Dismiss" secondary pending={action.isPending} onPress={() => action.mutate({path: `/reminders/${item.id}`, method: 'PATCH', data: {status: 'dismissed'}})}/>
        <Button title="Done" secondary pending={action.isPending} onPress={() => action.mutate({path: `/reminders/${item.id}`, method: 'PATCH', data: {status: 'completed'}})}/></View></Panel>)}
      {reminders.data?.items.length === 0 && <Empty text="Add a reminder here or while creating a task."/>}</Section>
    <Section title="Notification history"><Label muted>Accepted means the push service accepted a request. Local recorded is a development record. Neither guarantees that a person saw the notification.</Label>
      {history.data?.items.map(item => <Panel key={item.id}><Label>{item.status.replaceAll('_', ' ')}</Label><Label muted>{new Date(item.scheduled_for).toLocaleString()}{item.error_code ? ` · ${item.error_code}` : ''}</Label></Panel>)}
      {history.data?.items.length === 0 && <Label muted>No delivery attempts yet.</Label>}</Section><Button title="Back home" secondary onPress={() => router.replace('/')}/></Screen>;
}
