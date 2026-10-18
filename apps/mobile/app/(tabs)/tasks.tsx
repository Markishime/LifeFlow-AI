import {useState} from 'react';
import {View} from 'react-native';
import {useRouter} from 'expo-router';
import type {Page, Task} from '@lifeflow/api-contracts';
import {Button, Empty, ErrorNote, Field, Loading, Screen, styles} from '../../components/ui';
import {TaskRow} from '../../components/task-row';
import {useAction, useData} from '../../hooks/data';

export default function Tasks() {
  const router = useRouter(); const [search, setSearch] = useState('');
  const [status, setStatus] = useState(''); const [sort, setSort] = useState('due'); const [offset, setOffset] = useState(0);
  const data = useData<Page<Task>>(`/tasks?q=${encodeURIComponent(search)}${status ? `&status=${status}` : ''}&sort=${sort}&offset=${offset}&limit=25`);
  const action = useAction();
  return <Screen title="Your tasks" eyebrow="One step at a time" right={<Button title="Add task" onPress={() => router.push('/task/new')}/>}>
    <Field label="Search tasks" value={search} onChangeText={value => {setSearch(value); setOffset(0);}} placeholder="What are you looking for?"/>
    <View style={styles.row}>{[['All', ''], ['Pending', 'pending'], ['Waiting', 'waiting'], ['Completed', 'completed']].map(([title, value]) => <Button key={value} title={title!} secondary={status !== value} onPress={() => {setStatus(value!); setOffset(0);}}/>)}</View>
    <View style={styles.row}><Button title="By deadline" secondary={sort !== 'due'} onPress={() => setSort('due')}/><Button title="Newest first" secondary={sort !== 'created'} onPress={() => setSort('created')}/><Button title="Calendar" secondary onPress={() => router.push('/calendar')}/></View>
    <ErrorNote error={data.error || action.error}/>{data.isLoading && <Loading/>}
    {data.isError && <Button title="Retry" onPress={() => void data.refetch()}/>}
    {data.data?.items.map(task => <TaskRow key={task.id} task={task} onComplete={() => action.mutate({path: `/tasks/${task.id}`, method: 'PATCH', data: {status: 'completed'}})}/>)}
    {data.data?.items.length === 0 && <Empty text="No tasks match this view. Add a task or try another filter."/>}
    <View style={styles.row}><Button title="Previous" secondary disabled={offset === 0} onPress={() => setOffset(Math.max(0, offset - 25))}/><Button title="Next" secondary disabled={(data.data?.items.length || 0) < 25} onPress={() => setOffset(offset + 25)}/></View>
  </Screen>;
}
