import {useState} from 'react';
import {useLocalSearchParams, useRouter} from 'expo-router';
import type {Document, Extraction, Profile} from '@lifeflow/api-contracts';
import {Button, ErrorNote, Field, Label, Loading, Panel, Screen, Section} from '../../components/ui';
import {useAction, useData} from '../../hooks/data';
import {DateField} from '../../components/date-field';

export default function DocumentReview() {
  const {id} = useLocalSearchParams<{id: string}>(); const router = useRouter();
  const data = useData<Document>(`/documents/${id}`, true);
  const result = useData<{status: string; extraction: Extraction | null}>(`/documents/${id}/extraction`, true);
  const profile = useData<Profile>('/users/me'); const action = useAction();
  const [title, setTitle] = useState<string | null>(null); const [candidate, setCandidate] = useState<number | null>(null);
  const [reminder, setReminder] = useState(''); const [remove, setRemove] = useState(false);
  return <Screen title={data.data?.title || 'Document review'} eyebrow="You have the final say"><ErrorNote error={data.error || result.error || action.error}/>
    {data.isLoading && <Loading/>}{data.data?.status === 'queued' && <Panel><Label>Processing your document…</Label><Label muted>You can come back later. This page checks for updates automatically.</Label></Panel>}
    {data.data?.status === 'failed' && <Panel><Label>Extraction needs attention.</Label><Label muted>The original remains private. The processing job is available to the operator for review. You can delete and try a clearer file.</Label></Panel>}
    {result.data?.extraction && <><Panel><Label muted>{result.data.extraction.uncertainty}</Label><Label>{result.data.extraction.text.slice(0, 6000) || 'No readable text was found.'}</Label></Panel>
      <Section title="Potential dates">{result.data.extraction.dates.map((date, index) => <Panel key={index}><Label>{date.date || 'Ambiguous date'}</Label><Label muted>{date.kind} · {date.confirmation_status.replaceAll('_', ' ')}</Label><Label>{date.explanation}</Label>
        <Button title={candidate === index ? 'Selected for review' : 'Review this date'} secondary={candidate !== index} onPress={() => setCandidate(index)}/></Panel>)}
        {result.data.extraction.dates.length === 0 && <Label muted>No explicit ISO dates detected. You can add a reminder manually.</Label>}</Section>
      {data.data?.status === 'needs_review' && <><Field label="Document title" value={title ?? data.data.title} onChangeText={setTitle}/>
        <DateField label="Confirmed reminder time (optional)" value={reminder} onChangeText={setReminder}/>
        <Label muted>Choosing a date above does not create a reminder. Confirm the exact date, time and timezone here.</Label>
        <Button title="Confirm reviewed information" pending={action.isPending} onPress={() => action.mutate({path: `/documents/${id}/confirm`, data: {
          title: title ?? data.data?.title, category: String(result.data?.extraction?.fields.suggested_category || 'miscellaneous'),
          timezone: profile.data?.preferences.timezone || 'Asia/Manila', candidate_index: candidate, reminder_at: reminder || null,
        }})}/></>}
      {data.data?.status === 'confirmed' && <Label>Reviewed and saved. Any reminder you approved appears in Reminders.</Label>}</>}
    {remove ? <Panel><Label>Delete the original, extraction and associated reminders?</Label><Button title="Delete document permanently" danger pending={action.isPending} onPress={() => action.mutate({path: `/documents/${id}`, method: 'DELETE'}, {onSuccess: () => router.replace('/documents')})}/></Panel> : <Button title="Delete document" secondary onPress={() => setRemove(true)}/>}
    <Button title="Back to vault" secondary onPress={() => router.replace('/documents')}/></Screen>;
}
