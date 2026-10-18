import {useRef, useState} from 'react';
import {Platform, View} from 'react-native';
import {CameraView, useCameraPermissions} from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import {useRouter} from 'expo-router';
import {useQueryClient} from '@tanstack/react-query';
import {Button, ErrorNote, Label, Panel, Screen} from '../components/ui';
import {request} from '../services/api';

export default function Scan() {
  const router = useRouter(); const query = useQueryClient(); const camera = useRef<CameraView>(null);
  const [permission, askPermission] = useCameraPermissions(); const [showCamera, setShowCamera] = useState(false);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function upload(uri: string, name: string, mime: string, file?: File) {
    setBusy(true); setError('');
    try {
      const form = new FormData();
      if (Platform.OS === 'web') form.append('file', file || await (await fetch(uri)).blob(), name);
      else form.append('file', {uri, name, type: mime} as unknown as Blob);
      const data = await request<{id: string}>('/documents/upload', {method: 'POST', body: form});
      await query.invalidateQueries(); router.replace(`/document/${data.id}`);
    } catch (e) {setError(e instanceof Error ? e.message : 'Upload failed');} finally {setBusy(false);}
  }
  async function pick() {
    try {
      const result = await DocumentPicker.getDocumentAsync({type: ['application/pdf', 'image/jpeg', 'image/png'], copyToCacheDirectory: true});
      const file = result.assets?.[0];
      if (file) {
        if (file.size && file.size > 10 * 1024 * 1024) {setError('Choose a file smaller than 10 MB.'); return;}
        await upload(file.uri, file.name, file.mimeType || 'application/octet-stream', file.file);
      }
    } catch (e) {setError(String(e));}
  }
  async function photos() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {setError('Allow photo access to choose an image, or use the file picker.'); return;}
    const result = await ImagePicker.launchImageLibraryAsync({mediaTypes: ['images'], quality: 0.85});
    const image = result.assets?.[0];
    if (image) await upload(image.uri, image.fileName || 'photo.jpg', image.mimeType || 'image/jpeg');
  }
  async function scan() {
    const grant = permission?.granted ? permission : await askPermission();
    if (grant.granted) setShowCamera(true); else setError('Camera access is needed only to scan. You can also choose a file.');
  }
  async function capture() {
    const photo = await camera.current?.takePictureAsync({quality: 0.8});
    if (photo) {setShowCamera(false); await upload(photo.uri, 'scan.jpg', 'image/jpeg');}
  }
  return <Screen title="Bring a document in" eyebrow="Smart vault"><Label muted>PDF, JPG or PNG, up to 10 MB. Your original stays private. Scans are processed in the background.</Label>
    <ErrorNote error={error}/>{showCamera ? <><View style={{height: 380, borderRadius: 20, overflow: 'hidden'}}><CameraView ref={camera} style={{flex: 1}} facing="back"/></View>
      <Button title="Capture document" onPress={() => void capture()}/><Button title="Cancel camera" secondary onPress={() => setShowCamera(false)}/></> : <Panel>
      <Button title="Scan with camera" pending={busy} onPress={() => void scan()}/><Button title="Choose a file" secondary pending={busy} onPress={() => void pick()}/><Button title="Choose from photos" secondary pending={busy} onPress={() => void photos()}/></Panel>}
    {busy && <Label>Uploading securely. Processing will continue in the background…</Label>}<Button title="Back to vault" secondary onPress={() => router.replace('/documents')}/></Screen>;
}
