import {createElement, type ChangeEvent} from 'react';
import {View} from 'react-native';
import {Label} from './ui';
import {useTheme} from '../theme';
import type {DateFieldProps} from './date-field';

export function DateField({label, value, onChangeText}: DateFieldProps) {
  const c = useTheme();
  const date = value && !Number.isNaN(Date.parse(value)) ? new Date(value) : null;
  const local = date ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
  return <View style={{gap: 6}}><Label muted>{label}</Label>{createElement('input', {
    type: 'datetime-local', 'aria-label': label, value: local,
    onChange: (event: ChangeEvent<HTMLInputElement>) => onChangeText(event.target.value ? new Date(event.target.value).toISOString() : ''),
    style: {minHeight: 50, borderRadius: 12, padding: 14, border: `1px solid ${c.line}`, background: c.surface, color: c.text, fontSize: 16, fontFamily: 'inherit'},
  })}<Label muted>Choose a time in your device timezone.</Label></View>;
}
