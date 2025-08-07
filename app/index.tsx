import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';

export default function SplashScreen() {
  const { user, loading } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [user, loading, router]);

  return (
    <LinearGradient
      colors={isDark ? ['#0A0E1A', '#1E293B', '#4A90E2'] : ['#800080', '#FF4757']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>VidGro</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Watch And Earn</Text>
        <ActivityIndicator size="large" color={colors.text} style={styles.loader} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    opacity: 0.9,
    marginBottom: 40,
  },
  loader: {
    marginTop: 20,
  },
});