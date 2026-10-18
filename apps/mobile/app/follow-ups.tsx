import {useState} from 'react';
import {Share} from 'react-native';
import {useRouter} from 'expo-router';
import type {FollowUp, Page} from '@lifeflow/api-contracts';
import {Button, ErrorNote, Field, Label, Panel, Screen, Section} from '../components/ui';
import {useAction, useData} from '../hooks/data';
import {DateField} from '../components/date-field';

export default function FollowUps() {
  const router = useRouter(); const data = useData<Page<FollowUp>>('/follow-ups'); const action = useAction();
  const [title, setTitle] = useState(''); const [contact, setContact] = useState(''); const [date, setDate] = useState('');
  return <Screen title="Keep the conversation moving" eyebrow="Follow-ups"><Field label="What are you waiting for?" value={title} onChangeText={setTitle}/><Field label="Contact (optional)" value={contact} onChangeText={setContact}/><DateField label="Follow-up time" value={date} onChangeText={setDate}/>
    <Button title="Track follow-up" pending={action.isPending} disabled={!title.trim() || !date.trim()} onPress={() => action.mutate({path: '/follow-ups', data: {title, contact, follow_up_at: date}}, {onSuccess: () => {setTitle(''); setContact(''); setDate('');}})}/>
    <ErrorNote error={data.error || action.error}/><Section title="Waiting for a reply">{data.data?.items.map(item => <Panel key={item.id}><Label>{item.title} · {item.status}</Label><Label muted>{item.draft}</Label>
      <Button title="Review & share draft" secondary onPress={() => void Share.share({message: item.draft})}/><Button title="Mark resolved" secondary pending={action.isPending} disabled={item.status === 'resolved'} onPress={() => action.mutate({path: `/follow-ups/${item.id}`, method: 'PATCH', data: {status: 'resolved'}})}/></Panel>)}</Section>
    <Label muted>Nothing is sent automatically. Choose a sharing app and review the recipient yourself.</Label><Button title="Back home" secondary onPress={() => router.replace('/')}/></Screen>;
}
