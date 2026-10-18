import {Tabs} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {useTheme} from '../../theme';
import {useData} from '../../hooks/data';
import type {Profile} from '@lifeflow/api-contracts';
import {messages} from '../../services/i18n';

export default function TabLayout() {
  const c = useTheme(); const profile = useData<Profile>('/users/me');
  const t = messages[profile.data?.preferences.language || 'en'];
  const tabs = [['index', t.home, 'sunny-outline'], ['tasks', t.tasks, 'checkbox-outline'], ['assistant', t.assistant, 'sparkles-outline'], ['documents', t.documents, 'folder-outline'], ['profile', t.profile, 'person-outline']] as const;
  return <Tabs screenOptions={{headerShown: false, tabBarActiveTintColor: c.primary, tabBarInactiveTintColor: c.muted,
    tabBarStyle: {backgroundColor: c.surface, borderTopColor: c.line, minHeight: 66, paddingTop: 8}, tabBarLabelStyle: {fontSize: 11}}}>
    {tabs.map(([name, title, icon]) => <Tabs.Screen key={name} name={name} options={{title,
      tabBarIcon: ({color, size}) => <Ionicons name={icon} color={typeof color === 'string' ? color : c.primary} size={size}/>}}/>)}</Tabs>;
}
