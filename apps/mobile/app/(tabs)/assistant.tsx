import {useState} from 'react';
import {View} from 'react-native';
import type {ChatResponse, Page, Proposal} from '@lifeflow/api-contracts';
import {Button, Empty, ErrorNote, Field, Label, Panel, Screen, Section, styles} from '../../components/ui';
import {useAction, useData} from '../../hooks/data';

export default function Assistant() {
  const [message, setMessage] = useState(''); const [conversation, setConversation] = useState<string>();
  const [history, setHistory] = useState<{role: string; text: string}[]>([]);
  const chat = useAction<ChatResponse>(); const action = useAction(); const proposals = useData<Page<Proposal>>('/ai/action-proposals');
  function send() {
    if (!message.trim()) return;
    const text = message; setMessage(''); setHistory(old => [...old, {role: 'You', text}]);
    chat.mutate({path: '/ai/chat', data: {message: text, conversation_id: conversation}}, {onSuccess: data => {
      setConversation(data.conversation_id); setHistory(old => [...old, {role: 'LifeFlow', text: data.reply}]);
    }, onError: () => setMessage(text)});
  }
  return <Screen title="A helping hand." eyebrow="LifeFlow assistant"><Label muted>Ask about your responsibilities or propose a next step. You review changes before they happen.</Label>
    {history.length === 0 && <Empty text="Try “What tasks do I have?” or “Create a checklist for starting a new job.” AI processing requires your consent in Profile."/>}
    {history.map((item, index) => <Panel key={index}><Label muted>{item.role}</Label><Label>{item.text}</Label></Panel>)}
    <Field label="Ask LifeFlow" value={message} onChangeText={setMessage} multiline placeholder="What would make today easier?"/>
    <Button title="Send" onPress={send} pending={chat.isPending} disabled={!message.trim()}/><ErrorNote error={chat.error || action.error || proposals.error}/>
    <Section title="Actions awaiting your review">{proposals.data?.items.filter(p => p.status === 'pending').map(proposal => <Panel key={proposal.id}>
      <Label>{proposal.tool.replace('Proposal', '').replace(/([a-z])([A-Z])/g, '$1 $2')}</Label>
      {Object.entries(proposal.arguments).map(([key, value]) => <Label key={key} muted>{key.replaceAll('_', ' ')}: {typeof value === 'string' ? value : JSON.stringify(value)}</Label>)}
      <View style={styles.row}><Button title="Approve action" pending={action.isPending} onPress={() => action.mutate({path: `/ai/action-proposals/${proposal.id}/approve`})}/><Button title="Reject" secondary pending={action.isPending} onPress={() => action.mutate({path: `/ai/action-proposals/${proposal.id}/reject`})}/></View></Panel>)}
      {proposals.data?.items.filter(p => p.status === 'pending').length === 0 && <Label muted>No actions need approval.</Label>}</Section>
    <Section title="Recent decisions">{proposals.data?.items.filter(p => p.status !== 'pending').slice(0, 10).map(p => <Label key={p.id} muted>{p.tool} · {p.status}</Label>)}</Section>
  </Screen>;
}
