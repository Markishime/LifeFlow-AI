import type {ReactNode} from 'react';
import {ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTheme} from '../theme';
import {useNetworkState} from 'expo-network';

export function Screen({children, title, eyebrow, right}: {children: ReactNode; title: string; eyebrow?: string; right?: ReactNode}) {
  const c = useTheme();
  const network = useNetworkState();
  return <SafeAreaView style={{flex: 1, backgroundColor: c.bg}} edges={['top', 'left', 'right']}>
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <View style={styles.row}><View style={{flex: 1}}>{eyebrow && <Text style={[styles.eyebrow, {color: c.muted}]}>{eyebrow}</Text>}
        <Text accessibilityRole="header" style={[styles.title, {color: c.text}]}>{title}</Text></View>{right}</View>
      {network.isConnected === false && <Text accessibilityRole="alert" style={{color: c.muted}}>You're offline. Previously loaded information is available until this session closes. Reconnect to save changes.</Text>}{children}
    </ScrollView></SafeAreaView>;
}
export function Label({children, muted = false}: {children: ReactNode; muted?: boolean}) {
  const c = useTheme(); return <Text style={{color: muted ? c.muted : c.text, fontSize: 16, lineHeight: 24}}>{children}</Text>;
}
export function Section({title, children}: {title: string; children: ReactNode}) {
  const c = useTheme(); return <View style={{gap: 12, marginTop: 20}}><Text accessibilityRole="header" style={{fontSize: 20, fontWeight: '700', color: c.text}}>{title}</Text>{children}</View>;
}
export function Panel({children}: {children: ReactNode}) {
  const c = useTheme(); return <View style={{padding: 20, gap: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 20}}>{children}</View>;
}
export function Button({title, onPress, pending = false, secondary = false, danger = false, disabled = false}: {
  title: string; onPress: () => void; pending?: boolean; secondary?: boolean; danger?: boolean; disabled?: boolean;
}) {
  const c = useTheme(); return <Pressable accessibilityRole="button" accessibilityLabel={title}
    accessibilityState={{disabled: pending || disabled, busy: pending}} disabled={pending || disabled} onPress={onPress}
    style={({pressed}) => ({minHeight: 48, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center',
      opacity: pending || disabled ? 0.5 : pressed ? 0.75 : 1, backgroundColor: danger ? c.danger : secondary ? c.tint : c.primary})}>
    {pending ? <ActivityIndicator color={c.bg}/> : <Text style={{fontSize: 15, fontWeight: '700', color: secondary ? c.primary : c.bg}}>{title}</Text>}
  </Pressable>;
}
export function Field({label, ...props}: TextInputProps & {label: string}) {
  const c = useTheme(); return <View style={{gap: 6}}><Text style={{fontSize: 13, fontWeight: '600', color: c.muted}}>{label}</Text>
    <TextInput {...props} accessibilityLabel={label} placeholderTextColor={c.muted}
      style={[{minHeight: 50, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, color: c.text, fontSize: 16}, props.style]}/></View>;
}
export function ErrorNote({error}: {error: unknown}) {
  const c = useTheme(); if (!error) return null;
  return <Text accessibilityRole="alert" style={{color: c.danger, fontSize: 14, lineHeight: 22}}>{error instanceof Error ? error.message : String(error)}</Text>;
}
export function Empty({text}: {text: string}) {return <Panel><Label muted>{text}</Label></Panel>;}
export function Loading() {
  const c = useTheme(); return <View accessibilityLabel="Loading" style={{gap: 12}}>{[1, 2, 3].map(i => <View key={i} style={{height: 64, backgroundColor: c.line, borderRadius: 14}}/>)}</View>;
}
export const styles = StyleSheet.create({screen: {padding: 24, paddingBottom: 48, gap: 18, width: '100%', maxWidth: 760, alignSelf: 'center'},
  row: {flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap'}, title: {fontSize: 32, lineHeight: 40, fontWeight: '700', letterSpacing: -0.8},
  eyebrow: {fontSize: 12, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8}});
