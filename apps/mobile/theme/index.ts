import {useColorScheme} from 'react-native';
import {useSession} from '../store/session';

export const palettes = {
  light: {bg: '#F8FAFC', surface: '#FDFDFF', text: '#182039', muted: '#606B82', line: '#E1E5F0',
    primary: '#5558DB', tint: '#ECECFE', success: '#197249', danger: '#B63B4D'},
  dark: {bg: '#0B1020', surface: '#151D32', text: '#EDF0FA', muted: '#A4AEC6', line: '#2A3550',
    primary: '#A3A5FF', tint: '#27264B', success: '#69D7A0', danger: '#FF9AAB'},
};
export function useTheme() {
  const scheme = useColorScheme();
  const preference = useSession(s => s.theme);
  return palettes[(preference === 'system' ? scheme : preference) === 'dark' ? 'dark' : 'light'];
}
