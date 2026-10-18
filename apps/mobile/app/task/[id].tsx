import {useState} from 'react';
import {useLocalSearchParams, useRouter} from 'expo-router';
import type {Task, TaskStatus} from '@lifeflow/api-contracts';
import {Button, ErrorNote, Field, Label, Loading, Panel, Screen, Section} from '../../components/ui';
import {useAction, useData} from '../../hooks/data';

export default function TaskDetail() {
  const {id} = useLocalSearchParams<{id: string}>(); const router = useRouter();
  const task = useData<Task>(`/tasks/${id}`); const action = useAction(); const [title, setTitle] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  return <Screen title={task.data?.title || 'Task'} eyebrow="Task details"><ErrorNote error={task.error || action.error}/>{task.isLoading && <Loading/>}
    {task.data && <><Panel><Label muted>{task.data.category} · {task.data.priority} priority</Label><Label>{task.data.description || 'No notes added.'}</Label>
      <Label muted>{task.data.due_at ? new Date(task.data.due_at).toLocaleString(undefined, {timeZone: task.data.timezone}) : 'No deadline'} · {task.data.timezone}</Label>
      <Label>Status: {task.data.status.replaceAll('_', ' ')}</Label></Panel>
      <Field label="Task title" value={title ?? task.data.title} onChangeText={setTitle}/>
      <Button title="Save title" pending={action.isPending} disabled={!(title ?? task.data.title).trim()} onPress={() => action.mutate({path: `/tasks/${id}`, method: 'PATCH', data: {title: title ?? task.data?.title}})}/>
      <Section title="Update status">{(['pending', 'in_progress', 'waiting', 'completed', 'cancelled'] as TaskStatus[]).map(status => <Button key={status} title={status.replaceAll('_', ' ')} secondary={task.data?.status !== status} pending={action.isPending} onPress={() => action.mutate({path: `/tasks/${id}`, method: 'PATCH', data: {status}})}/>)}</Section>
      {confirmDelete ? <Panel><Label>Delete this task and its reminders?</Label><Button title="Delete permanently" danger pending={action.isPending} onPress={() => action.mutate({path: `/tasks/${id}`, method: 'DELETE'}, {onSuccess: () => router.replace('/tasks')})}/><Button title="Keep task" secondary onPress={() => setConfirmDelete(false)}/></Panel> : <Button title="Delete task" secondary onPress={() => setConfirmDelete(true)}/>}</>}
    <Button title="Back to tasks" secondary onPress={() => router.replace('/tasks')}/></Screen>;
}
