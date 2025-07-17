import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/contexts/AuthContext';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

// Import polyfills AFTER other imports to prevent module loading conflicts
import 'react-native-url-polyfill/auto';

// Enhanced polyfill for structuredClone with proper global checks
if (typeof global !== 'undefined') {
  // Polyfill for structuredClone if not available
  if (typeof global.structuredClone === 'undefined') {
    global.structuredClone = (obj: any) => {
      try {
        return JSON.parse(JSON.stringify(obj));
      } catch (error) {
        console.warn('structuredClone polyfill failed:', error);
        return obj;
      }
    };
  }

  // Enhanced import.meta polyfill for global scope
  if (typeof global.importMeta === 'undefined') {
    global.importMeta = {
      env: process.env || {},
      url: 'file:///',
    };
  }

  // Polyfill for import.meta.env specifically
  if (typeof process !== 'undefined' && process.env) {
    global.importMetaEnv = process.env;
  }
}

// Additional window-based polyfills for web compatibility
if (typeof window !== 'undefined') {
  // Ensure import.meta is available in window scope
  if (typeof (window as any).importMeta === 'undefined') {
    (window as any).importMeta = {
      env: process.env || {},
      url: window.location?.href || 'file:///',
    };
  }
}

export default function RootLayout() {
  useFrameworkReady();

  // Additional runtime checks for import.meta compatibility
  useEffect(() => {
    // Verify polyfills are working
    if (typeof global !== 'undefined' && !global.structuredClone) {
      console.warn('structuredClone polyfill not applied correctly');
    }
    
    // Log environment for debugging
    console.log('Environment check:', {
      hasGlobal: typeof global !== 'undefined',
      hasWindow: typeof window !== 'undefined',
      hasProcess: typeof process !== 'undefined',
      nodeEnv: process.env?.NODE_ENV,
    });
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