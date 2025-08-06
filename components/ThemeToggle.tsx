import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Platform, View } from 'react-native';
import { Sun, Moon } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function ThemeToggle() {
  const { isDark, toggleTheme, colors } = useTheme();
  
  // Animation values
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const slideX = useSharedValue(isDark ? 24 : 0);
  const colorProgress = useSharedValue(isDark ? 1 : 0);

  useEffect(() => {
    // Animate color transition
    colorProgress.value = withTiming(isDark ? 1 : 0, {
      duration: 300,
    });
    
    // Animate slide transition
    slideX.value = withTiming(isDark ? 24 : 0, {
      duration: 300,
    });
    
    // Animate rotation with smooth timing
    rotation.value = withTiming(isDark ? 180 : 0, {
      duration: 300,
    });
  }, [isDark]);

  const handleToggle = () => {
    // Haptic feedback (only on native platforms)
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Scale animation for press feedback
    scale.value = withSequence(
      withSpring(0.9, { damping: 15, stiffness: 300 }),
      withSpring(1, { damping: 15, stiffness: 300 })
    );

    toggleTheme();
  };

  const containerAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      colorProgress.value,
      [0, 1],
      ['rgba(255, 215, 0, 0.15)', 'rgba(147, 112, 219, 0.15)']
    );

    return {
      backgroundColor,
    };
  });

  const sliderAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      colorProgress.value,
      [0, 1],
      ['#FFD700', '#9370DB']
    );

    return {
      transform: [
        { translateX: slideX.value },
        { scale: scale.value },
        { rotate: `${rotation.value}deg` }
      ],
      backgroundColor,
    };
  });

  const iconColor = isDark ? '#9370DB' : '#FFD700';

  return (
    <TouchableOpacity onPress={handleToggle} activeOpacity={0.7}>
      <Animated.View style={[styles.container, containerAnimatedStyle]}>
        <View style={styles.track}>
          <Animated.View style={[styles.slider, sliderAnimatedStyle]}>
            {isDark ? (
              <Moon size={16} color={iconColor} fill={iconColor} />
            ) : (
              <Sun size={16} color={iconColor} fill={iconColor} />
            )}
          </Animated.View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 56,
    height: 32,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  track: {
    flex: 1,
    position: 'relative',
  },
  slider: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});