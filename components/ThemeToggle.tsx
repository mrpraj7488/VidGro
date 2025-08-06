import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Sun, Moon } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function ThemeToggle() {
  const { isDark, toggleTheme, colors } = useTheme();
  
  // Animation values
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const colorProgress = useSharedValue(isDark ? 1 : 0);

  useEffect(() => {
    // Animate color transition
    colorProgress.value = withSpring(isDark ? 1 : 0, {
      damping: 15,
      stiffness: 150,
    });
    
    // Animate rotation
    rotation.value = withSpring(isDark ? 180 : 0, {
      damping: 15,
      stiffness: 150,
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

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      colorProgress.value,
      [0, 1],
      ['rgba(255, 215, 0, 0.2)', 'rgba(147, 112, 219, 0.2)']
    );

    return {
      transform: [
        { scale: scale.value },
        { rotate: `${rotation.value}deg` }
      ],
      backgroundColor,
    };
  });

  const iconColor = isDark ? '#9370DB' : '#FFD700';

  return (
    <TouchableOpacity onPress={handleToggle} activeOpacity={0.7}>
      <Animated.View style={[styles.container, animatedStyle]}>
        {isDark ? (
          <Moon size={20} color={iconColor} fill={iconColor} />
        ) : (
          <Sun size={20} color={iconColor} fill={iconColor} />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
});