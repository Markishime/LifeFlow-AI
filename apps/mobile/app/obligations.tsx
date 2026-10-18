import {useState} from 'react';
import {useRouter} from 'expo-router';
import type {Obligation, Page} from '@lifeflow/api-contracts';
import {Button, Empty, ErrorNote, Field, Label, Panel, Screen, Section} from '../components/ui';
import {useAction, useData} from '../hooks/data';
import {DateField} from '../components/date-field';

export default function Obligations() {
  const router = useRouter(); const data = useData<Page<Obligation>>('/obligations'); const action = useAction();
  const [title, setTitle] = useState(''); const [amount, setAmount] = useState(''); const [due, setDue] = useState('');
  return <Screen title="Fewer things to remember" eyebrow="Bills & renewals"><Label muted>Track responsibilities and record your own confirmation. LifeFlow does not process payments.</Label>
    <Section title="Add a responsibility"><Field label="Title" value={title} onChangeText={setTitle}/><Field label="Amount in PHP (optional)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad"/>
      <DateField label="Due date" value={due} onChangeText={setDue}/>
      <Button title="Save & remind one day before" pending={action.isPending} disabled={!title.trim() || !due.trim()} onPress={() => action.mutate({path: '/obligations', data: {title, amount: amount || null, due_at: due, currency: 'PHP'}}, {onSuccess: () => {setTitle(''); setAmount(''); setDue('');}})}/></Section>
    <ErrorNote error={data.error || action.error}/>{data.data?.items.map(item => <Panel key={item.id}><Label>{item.title}</Label><Label muted>{item.amount ? `${item.currency} ${item.amount} · ` : ''}{new Date(item.due_at).toLocaleDateString()} · {item.status}</Label>
      {item.status === 'pending' && <Button title="I confirm this is paid / completed" secondary pending={action.isPending} onPress={() => action.mutate({path: `/obligations/${item.id}`, method: 'PATCH', data: {status: 'confirmed'}})}/>}</Panel>)}
    {data.data?.items.length === 0 && <Empty text="Your recurring responsibilities will appear here. Add a bill or renewal above."/>}<Button title="Back home" secondary onPress={() => router.replace('/')}/></Screen>;
}
