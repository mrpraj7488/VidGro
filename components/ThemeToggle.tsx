import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Platform, View, Dimensions } from 'react-native';
import { Sun, Moon } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolateColor,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width: screenWidth } = Dimensions.get('window');

export default function ThemeToggle() {
  const { isDark, toggleTheme, colors } = useTheme();
  
  // Animation values
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const slideX = useSharedValue(isDark ? 24 : 0);
  const colorProgress = useSharedValue(isDark ? 1 : 0);
  const glowOpacity = useSharedValue(0);
  const iconScale = useSharedValue(1);

  useEffect(() => {
    // Animate color transition
    colorProgress.value = withTiming(isDark ? 1 : 0, {
      duration: 400,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
    
    // Animate slide transition
    slideX.value = withTiming(isDark ? 24 : 0, {
      duration: 400,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
    
    // Enhanced rotation with spring physics
    rotation.value = withSpring(isDark ? 360 : 0, {
      damping: 20,
      stiffness: 150,
      mass: 1,
    });

    // Glow effect for dark mode
    glowOpacity.value = withTiming(isDark ? 1 : 0, {
      duration: 400,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });

    // Icon scale animation
    iconScale.value = withSequence(
      withTiming(1.2, { duration: 200, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
      withTiming(1, { duration: 200, easing: Easing.bezier(0.4, 0, 0.2, 1) })
    });
  }, [isDark]);

  const handleToggle = () => {
    // Haptic feedback (only on native platforms)
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Enhanced scale animation with better spring physics
    scale.value = withSequence(
      withSpring(0.85, { damping: 20, stiffness: 400 }),
      withSpring(1, { damping: 20, stiffness: 400 })
    );

    // Icon bounce effect
    iconScale.value = withSequence(
      withTiming(0.8, { duration: 100 }),
      withSpring(1.1, { damping: 15, stiffness: 300 }),
      withSpring(1, { damping: 15, stiffness: 300 })
    );

    toggleTheme();
  };

  const containerAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      colorProgress.value,
      [0, 1],
      ['rgba(255, 215, 0, 0.12)', 'rgba(74, 144, 226, 0.15)']
    );

    const borderColor = interpolateColor(
      colorProgress.value,
      [0, 1],
      ['rgba(255, 215, 0, 0.3)', 'rgba(74, 144, 226, 0.4)']
    );

    const shadowColor = interpolateColor(
      colorProgress.value,
      [0, 1],
      ['rgba(255, 215, 0, 0)', 'rgba(0, 212, 255, 0.3)']
    );

    return {
      backgroundColor,
      borderColor,
      shadowColor,
      shadowOpacity: glowOpacity.value * 0.6,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 0 },
      elevation: glowOpacity.value * 8,
      transform: [{ scale: scale.value }],
    };
  });

  const sliderAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      colorProgress.value,
      [0, 1],
      ['#FFD700', '#4A90E2']
    );

    const shadowColor = interpolateColor(
      colorProgress.value,
      [0, 1],
      ['rgba(255, 215, 0, 0.4)', 'rgba(0, 212, 255, 0.6)']
    );

    return {
      transform: [
        { translateX: slideX.value },
        { scale: iconScale.value },
        { rotate: `${rotation.value}deg` }
      ],
      backgroundColor,
      shadowColor,
      shadowOpacity: 0.8,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 6,
    };
  });

  const iconAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: iconScale.value }],
    };
  });

  const iconColor = isDark ? '#00D4FF' : '#FFD700';

  return (
    <TouchableOpacity onPress={handleToggle} activeOpacity={0.7}>
      <Animated.View style={[styles.container, containerAnimatedStyle]}>
        <View style={styles.track}>
          <Animated.View style={[styles.slider, sliderAnimatedStyle]}>
            <Animated.View style={iconAnimatedStyle}>
              {isDark ? (
                <Moon size={16} color={iconColor} fill={iconColor} />
              ) : (
                <Sun size={16} color={iconColor} fill={iconColor} />
              )}
            </Animated.View>
          </Animated.View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 52,
    height: 28,
    borderRadius: 14,
    padding: 2,
    borderWidth: 1.5,
  },
  track: {
    flex: 1,
    position: 'relative',
  },
  slider: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    top: 1,
  },
});