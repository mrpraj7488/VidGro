import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { ConfigProvider } from '../contexts/ConfigContext';
import ConfigLoader from '../components/ConfigLoader';

export default function RootLayout() {
  useFrameworkReady();



  return (
    <ConfigProvider>
      <ThemeProvider>
        <ConfigLoader>
          <AuthProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="edit-profile" />
              <Stack.Screen name="become-vip" />
              <Stack.Screen name="buy-coins" />
              <Stack.Screen name="configure-ads" />
              <Stack.Screen name="report-problem" />
              <Stack.Screen name="rate-us" />
              <Stack.Screen name="refer-friend" />
              <Stack.Screen name="privacy-policy" />
              <Stack.Screen name="terms" />
              <Stack.Screen name="languages" />
              <Stack.Screen name="contact-support" />
              <Stack.Screen name="delete-account" />
              <Stack.Screen name="transaction-history" />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="auto" />
          </AuthProvider>
        </ConfigLoader>
      </ThemeProvider>
    </ConfigProvider>
  );
}
