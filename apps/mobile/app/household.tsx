import {useState} from 'react';
import {useRouter} from 'expo-router';
import type {Household, Member, Page} from '@lifeflow/api-contracts';
import {Button, ErrorNote, Field, Label, Panel, Screen, Section} from '../components/ui';
import {useAction, useData} from '../hooks/data';

export default function Households() {
  const router = useRouter(); const [name, setName] = useState(''); const [email, setEmail] = useState('');
  const [selected, setSelected] = useState(''); const households = useData<Page<Household>>('/households');
  const invites = useData<Page<Member>>('/households/invitations');
  const detail = useData<Household>(`/households/${selected || 'none'}`, false, Boolean(selected)); const action = useAction<Household>();
  return <Screen title="Share the responsibility" eyebrow="Household"><Label muted>Only explicitly shared tasks are visible to members. Your document vault stays private.</Label>
    <Field label="Household name" value={name} onChangeText={setName}/><Button title="Create household" pending={action.isPending} disabled={!name.trim()} onPress={() => action.mutate({path: '/households', data: {name}}, {onSuccess: home => {setSelected(home.id); setName('');}})}/>
    <ErrorNote error={households.error || invites.error || action.error}/>
    <Section title="Invitations">{invites.data?.items.map(invite => <Panel key={invite.id}><Label>Invitation as {invite.role}</Label><Button title="Accept invitation" pending={action.isPending} onPress={() => action.mutate({path: `/households/invitations/${invite.id}/accept`})}/><Button title="Decline" secondary pending={action.isPending} onPress={() => action.mutate({path: `/households/invitations/${invite.id}/reject`})}/></Panel>)}</Section>
    <Section title="Your households">{households.data?.items.map(home => <Button key={home.id} title={home.name} secondary={selected !== home.id} onPress={() => setSelected(home.id)}/>)}</Section>
    {selected && <><ErrorNote error={detail.error}/><Field label="Invite by email (in-app invitation)" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"/>
      <Button title="Create invitation" pending={action.isPending} disabled={!email.trim()} onPress={() => action.mutate({path: `/households/${selected}/invitations`, data: {email}}, {onSuccess: () => setEmail('')})}/>
      {detail.data?.members?.map(member => <Panel key={member.id}><Label>{member.email}</Label><Label muted>{member.role} · {member.status}</Label>{member.role !== 'owner' && member.status !== 'revoked' && <Button title="Revoke access" secondary pending={action.isPending} onPress={() => action.mutate({path: `/households/${selected}/members/${member.id}`, method: 'DELETE'})}/>}</Panel>)}</>}
    <Button title="Back home" secondary onPress={() => router.replace('/')}/></Screen>;
}
