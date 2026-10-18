import {useState} from 'react';
import {Platform, View} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {Button, Label, styles} from './ui';

export type DateFieldProps = {label: string; value: string; onChangeText: (value: string) => void};
export function DateField({label, value, onChangeText}: DateFieldProps) {
  const [mode, setMode] = useState<'date' | 'time' | null>(null);
  const selected = value && !Number.isNaN(Date.parse(value)) ? new Date(value) : new Date(Date.now() + 3600000);
  return <View style={{gap: 10}}><Label muted>{label}</Label><Label>{value ? selected.toLocaleString() : 'No date selected'}</Label>
    <View style={styles.row}><Button title="Choose date" secondary onPress={() => setMode('date')}/><Button title="Choose time" secondary onPress={() => setMode('time')}/>{value && <Button title="Clear date" secondary onPress={() => onChangeText('')}/>}</View>
    {mode && <><DateTimePicker value={selected} mode={mode} display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(_event, date) => {if (Platform.OS === 'android') setMode(null); if (date) onChangeText(date.toISOString());}}/>
      {Platform.OS === 'ios' && <Button title="Done choosing" secondary onPress={() => setMode(null)}/>}</>}
    <Label muted>Choose a time in your device timezone.</Label></View>;
}
