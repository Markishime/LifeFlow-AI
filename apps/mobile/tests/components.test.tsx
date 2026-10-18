import React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {Button, ErrorNote} from '../components/ui';
import {TaskRow} from '../components/task-row';
import type {Task} from '@lifeflow/api-contracts';

jest.mock('expo-router', () => ({useRouter: () => ({push: jest.fn()})}));
jest.mock('../theme', () => ({useTheme: () => ({bg: '#F8FAFC', text: '#182039', primary: '#5558DB', muted: '#606B82', line: '#E1E5F0', success: '#197249', danger: '#B63B4D'})}));

test('pending actions cannot be submitted again', () => {
  const onPress = jest.fn(); const view = render(<Button title="Save task" onPress={onPress} pending/>);
  fireEvent.press(view.getByRole('button', {name: 'Save task'}));
  expect(onPress).not.toHaveBeenCalled();
});

test('task completion is explicit and accessible', () => {
  const onComplete = jest.fn(); const task: Task = {id: 'one', owner_id: 'owner', title: 'Renew permit', description: '', category: 'personal',
    priority: 'high', status: 'pending', due_at: null, timezone: 'Asia/Manila', recurrence: null, household_id: null, completed_at: null, created_at: ''};
  const view = render(<TaskRow task={task} onComplete={onComplete}/>);
  fireEvent.press(view.getByRole('checkbox', {name: 'Complete Renew permit'}));
  expect(onComplete).toHaveBeenCalledTimes(1);
});

test('errors expose a readable recovery message', () => {
  const view = render(<ErrorNote error={new Error('Connection unavailable. Try again.')}/>);
  expect(view.getByRole('alert').props.children).toBe('Connection unavailable. Try again.');
});
