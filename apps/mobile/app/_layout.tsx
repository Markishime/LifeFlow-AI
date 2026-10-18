import '../global.css';
import {useEffect} from 'react';
import {AppState, Text, View} from 'react-native';
import {Stack, useRouter, useSegments} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {QueryClient, QueryClientProvider, focusManager, onlineManager} from '@tanstack/react-query';
import * as Network from 'expo-network';
import * as Notifications from 'expo-notifications';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {supabase} from '../services/auth';
import {useSession} from '../store/session';
import {ApiError} from '../services/api';

export const queryClient = new QueryClient({defaultOptions: {queries: {staleTime: 15000,
  retry: (count, error) => count < 2 && !(error instanceof ApiError && error.status < 500)}, mutations: {retry: false}}});
Notifications.setNotificationHandler({handleNotification: async () => ({shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true})});

export default function Root() {
  const {session, restored, setSession, setRestored} = useSession();
  const router = useRouter(); const segments = useSegments();
  useEffect(() => {
    void supabase.auth.getSession().then(({data}) => {setSession(data.session); setRestored();});
    const {data} = supabase.auth.onAuthStateChange((_event, next) => {
      queryClient.clear(); setSession(next); setRestored();
    });
    const appState = AppState.addEventListener('change', state => focusManager.setFocused(state === 'active'));
    const network = Network.addNetworkStateListener(state => onlineManager.setOnline(Boolean(state.isConnected)));
    const notification = Notifications.addNotificationResponseReceivedListener(() => router.push('/reminders'));
    return () => {data.subscription.unsubscribe(); appState.remove(); network.remove(); notification.remove();};
  }, [router, setRestored, setSession]);
  useEffect(() => {
    if (!restored) return;
    const publicRoute = segments[0] === 'login' || segments[0] === 'auth';
    if (!session && !publicRoute) router.replace('/login');
    if (session && segments[0] === 'login') router.replace('/');
  }, [restored, router, segments, session]);
  if (!restored) return <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}><Text>Opening LifeFlow…</Text></View>;
  return <SafeAreaProvider><QueryClientProvider client={queryClient}><StatusBar style="auto"/>
    <Stack screenOptions={{headerShown: false}}/></QueryClientProvider></SafeAreaProvider>;
}
