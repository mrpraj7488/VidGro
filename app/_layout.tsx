import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, useColorScheme } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { ConfigProvider } from '../contexts/ConfigContext';
import { AlertProvider } from '../contexts/AlertContext';
import ConfigLoader from '../components/ConfigLoader';

function RootStack() {
  const { colors, isDark } = useTheme();
  
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack 
        screenOptions={{ 
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade_from_bottom'
        }}
      >
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
        <Stack.Screen name="edit-video" />
        <Stack.Screen name="faq" />
      </Stack>
      <StatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.background} />
    </View>
  );
}

export default function RootLayout() {
  useFrameworkReady();
  const colorScheme = useColorScheme();

  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: colorScheme === 'dark' ? '#0A0E1A' : '#F5F5F5' 
    }}>
      <ConfigProvider>
        <ThemeProvider>
          <AlertProvider>
            <ConfigLoader>
              <AuthProvider>
                <RootStack />
              </AuthProvider>
            </ConfigLoader>
          </AlertProvider>
        </ThemeProvider>
      </ConfigProvider>
    </View>
  );
}
