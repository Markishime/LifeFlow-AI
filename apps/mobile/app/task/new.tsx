import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useRouter} from 'expo-router';
import type {Profile} from '@lifeflow/api-contracts';
import {Button, ErrorNote, Field, Label, Screen} from '../../components/ui';
import {useAction, useData} from '../../hooks/data';
import {DateField} from '../../components/date-field';

export const taskSchema = z.object({title: z.string().trim().min(1, 'Give your task a title').max(200), description: z.string().max(10000),
  due: z.string().refine(v => !v || z.string().datetime({offset: true}).safeParse(v).success, 'Use a date with a timezone offset, for example 2026-11-01T09:00:00+08:00'),
  reminder: z.string().refine(v => !v || z.string().datetime({offset: true}).safeParse(v).success, 'Use a date with timezone offset')});
export default function NewTask() {
  const router = useRouter(); const action = useAction(); const profile = useData<Profile>('/users/me');
  const {control, handleSubmit, formState: {errors}} = useForm<z.infer<typeof taskSchema>>({resolver: zodResolver(taskSchema), defaultValues: {title: '', description: '', due: '', reminder: ''}});
  return <Screen title="A new next step" eyebrow="Add task"><Label muted>Give it a name. Add a deadline or reminder when you need one.</Label>
    {(['title', 'description'] as const).map(name => <Controller key={name} control={control} name={name} render={({field: {value, onChange}}) => <><Field label={{title: 'Task title', description: 'Notes (optional)'}[name]}
      value={value} onChangeText={onChange} multiline={name === 'description'}/><ErrorNote error={errors[name]?.message}/></>}/>) }
    {(['due', 'reminder'] as const).map(name => <Controller key={name} control={control} name={name} render={({field: {value, onChange}}) => <><DateField label={name === 'due' ? 'Deadline (optional)' : 'Remind me at (optional)'} value={value} onChangeText={onChange}/><ErrorNote error={errors[name]?.message}/></>}/>)}
    <Label muted>Timezone: {profile.data?.preferences.timezone || 'Asia/Manila'}. Notification permission can be enabled in Profile.</Label>
    <ErrorNote error={action.error}/><Button title="Save task" pending={action.isPending} onPress={() => void handleSubmit(values => action.mutate({path: '/tasks', data: {
      title: values.title, description: values.description, due_at: values.due || null, reminder_at: values.reminder || null, timezone: profile.data?.preferences.timezone || 'Asia/Manila',
    }}, {onSuccess: () => router.replace('/tasks')}))()}/><Button title="Cancel" secondary onPress={() => router.back()}/>
  </Screen>;
}
