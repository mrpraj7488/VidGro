import { useEffect, useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { SplashScreen } from 'expo-router';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence,
  Easing 
} from 'react-native-reanimated';

SplashScreen.preventAutoHideAsync();

export default function Index() {
  const { user, loading, profile } = useAuth();
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const hasNavigated = useRef(false);

  useEffect(() => {
    // Start animation immediately
    logoScale.value = withSequence(
      withTiming(1.2, { duration: 600, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 200 })
    );
    logoOpacity.value = withTiming(1, { duration: 800 });
  }, []);

  useEffect(() => {
    // Handle navigation when auth state is ready
    if (!loading && !hasNavigated.current) {
      hasNavigated.current = true;
      
      const timer = setTimeout(() => {
        SplashScreen.hideAsync().then(() => {
          if (user) {
            console.log('User authenticated, navigating to tabs');
            router.replace('/(tabs)');
          } else {
            console.log('User not authenticated, navigating to login');
            router.replace('/(auth)/login');
          }
        });
      }, 100); // Minimal timeout for immediate navigation

      return () => clearTimeout(timer);
    }
  }
  )

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  return (
    <LinearGradient
      colors={['#FF4757', '#FF6B8A', '#FFA726']}
      style={styles.container}
    >
      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>VidGro</Text>
          <Text style={styles.tagline}>Watch & Earn</Text>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 8,
    fontWeight: '500',
  },
});