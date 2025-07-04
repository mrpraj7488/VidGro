import { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
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
  const { user, loading } = useAuth();
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
            router.replace('/(tabs)');
          } else {
            router.replace('/(auth)/login');
          }
        });
      }, 1500); // Reduced timeout for faster navigation

      return () => clearTimeout(timer);
    }
  }, [user, loading]);

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
          <Animated.Text style={styles.logoText}>VidGro</Animated.Text>
          <Animated.Text style={styles.tagline}>Watch & Earn</Animated.Text>
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
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 8,
    fontWeight: '500',
  },
});