import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/contexts/AuthContext';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { GoogleMobileAds } from '@/utils/ad-module';
import 'react-native-url-polyfill/auto';

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    // Initialize Google Mobile Ads only on Android
    if (Platform.OS === 'android' && GoogleMobileAds) {
      GoogleMobileAds.initialize()
        .then(() => {
          console.log('Google Mobile Ads initialized successfully');
        })
        .catch((error: any) => {
          console.warn('Failed to initialize Google Mobile Ads:', error);
        });
    }
  }, []);

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" />
    </AuthProvider>
  );
}