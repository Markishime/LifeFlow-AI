import {useRouter} from 'expo-router';
import type {Page, Task} from '@lifeflow/api-contracts';
import {Button, Empty, ErrorNote, Screen, Section} from '../components/ui';
import {TaskRow} from '../components/task-row';
import {useData} from '../hooks/data';

export default function Calendar() {
  const router = useRouter(); const data = useData<Page<Task>>('/tasks?sort=due&limit=100');
  const groups = new Map<string, Task[]>();
  for (const task of data.data?.items || []) {
    if (!task.due_at) continue;
    const date = new Date(task.due_at).toLocaleDateString(undefined, {timeZone: task.timezone, weekday: 'long', month: 'long', day: 'numeric'});
    groups.set(date, [...groups.get(date) || [], task]);
  }
  return <Screen title="What's coming up" eyebrow="Calendar agenda"><ErrorNote error={data.error}/>{[...groups].map(([date, tasks]) => <Section key={date} title={date}>{tasks.map(task => <TaskRow key={task.id} task={task}/>)}</Section>)}
    {data.data && groups.size === 0 && <Empty text="Add a deadline to a task to see it in your calendar agenda."/>}<Button title="Back home" secondary onPress={() => router.replace('/')}/></Screen>;
}
