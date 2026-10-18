import type {ExpoConfig} from 'expo/config';

const config: ExpoConfig = {
  name: 'LifeFlow AI', slug: 'lifeflow-ai', version: '0.1.0', scheme: 'lifeflow',
  orientation: 'portrait', userInterfaceStyle: 'automatic',
  icon: './assets/icon.png',
  ios: {bundleIdentifier: 'com.example.lifeflow', supportsTablet: true},
  android: {package: 'com.example.lifeflow', adaptiveIcon: {foregroundImage: './assets/icon.png', backgroundColor: '#6366F1'}},
  plugins: ['expo-router', 'expo-secure-store', 'expo-localization', 'expo-sqlite',
    ['expo-splash-screen', {image: './assets/splash.png', imageWidth: 180, backgroundColor: '#F8FAFC', dark: {backgroundColor: '#0B1020'}}],
    ['expo-notifications', {color: '#6366F1'}],
    ['expo-camera', {cameraPermission: 'Use your camera to scan a document you choose.', recordAudioAndroid: false}],
    ['expo-image-picker', {photosPermission: 'Choose documents from your photo library.', microphonePermission: false}]],
  experiments: {typedRoutes: false},
  extra: {eas: {projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || ''}},
};
export default config;
