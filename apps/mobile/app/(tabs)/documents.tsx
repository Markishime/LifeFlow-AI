import {useState} from 'react';
import {Pressable} from 'react-native';
import {useRouter} from 'expo-router';
import type {Document, Page} from '@lifeflow/api-contracts';
import {Button, Empty, ErrorNote, Field, Label, Loading, Panel, Screen} from '../../components/ui';
import {useData} from '../../hooks/data';

export default function Documents() {
  const data = useData<Page<Document>>('/documents', true); const router = useRouter(); const [search, setSearch] = useState('');
  return <Screen title="Your smart vault" eyebrow="Private by default" right={<Button title="Add document" onPress={() => router.push('/scan')}/>}>
    <Label muted>Keep originals close and deadlines in view. Every extracted date is yours to confirm.</Label>
    <Field label="Filter documents" value={search} onChangeText={setSearch}/><ErrorNote error={data.error}/>{data.isLoading && <Loading/>}
    {data.data?.items.filter(doc => doc.title.toLowerCase().includes(search.toLowerCase())).map(doc => <Pressable key={doc.id} accessibilityRole="button" accessibilityLabel={`Review ${doc.title}`} onPress={() => router.push(`/document/${doc.id}`)}>
      <Panel><Label>{doc.title}</Label><Label muted>{doc.category} · {doc.status.replaceAll('_', ' ')}</Label></Panel></Pressable>)}
    {data.data?.items.length === 0 && <Empty text="Add your first PDF, photo or scan. LifeFlow will extract text for you to review."/>}
    <Button title="Refresh vault" secondary onPress={() => void data.refetch()}/></Screen>;
}
