import {Pressable, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import type {Task} from '@lifeflow/api-contracts';
import {useTheme} from '../theme';

export function TaskRow({task, onComplete}: {task: Task; onComplete?: () => void}) {
  const c = useTheme(); const router = useRouter();
  const overdue = task.due_at && new Date(task.due_at) < new Date() && task.status !== 'completed';
  return <View style={{flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: c.line}}>
    <Pressable accessibilityRole="checkbox" accessibilityLabel={`Complete ${task.title}`} accessibilityState={{checked: task.status === 'completed'}}
      onPress={onComplete} disabled={!onComplete || task.status === 'completed'} style={{minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center'}}>
      <View style={{width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: task.status === 'completed' ? c.success : c.muted, backgroundColor: task.status === 'completed' ? c.success : 'transparent'}}>
        {task.status === 'completed' && <Text style={{color: c.bg, textAlign: 'center'}}>✓</Text>}</View></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${task.title}`} onPress={() => router.push(`/task/${task.id}`)} style={{flex: 1, gap: 4, minHeight: 44}}>
      <Text style={{fontSize: 16, fontWeight: '600', color: c.text, textDecorationLine: task.status === 'completed' ? 'line-through' : 'none'}}>{task.title}</Text>
      <Text style={{fontSize: 13, color: overdue ? c.danger : c.muted}}>{task.due_at ? `${overdue ? 'Overdue · ' : ''}${new Date(task.due_at).toLocaleString(undefined, {timeZone: task.timezone})}` : 'No deadline'} · {task.priority}</Text>
    </Pressable></View>;
}
