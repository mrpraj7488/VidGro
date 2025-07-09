import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Timer } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withRepeat,
  Easing
} from 'react-native-reanimated';

interface VideoHoldTimerProps {
  holdUntil: string;
  createdAt: string;
  onComplete?: () => void;
  size?: 'small' | 'medium' | 'large';
}

export default function VideoHoldTimer({ 
  holdUntil, 
  createdAt, 
  onComplete,
  size = 'medium' 
}: VideoHoldTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // Animation values
  const pulseScale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Start pulse animation
    pulseScale.value = withRepeat(
      withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      let holdUntilTime: Date;
      
      if (holdUntil) {
        // Use the exact hold_until timestamp from database
        holdUntilTime = new Date(holdUntil);
      } else {
        // Fallback: calculate 10 minutes from creation (not 20)
        holdUntilTime = new Date(createdAt);
        holdUntilTime.setMinutes(holdUntilTime.getMinutes() + 10);
      }
      
      const now = new Date();
      const remaining = Math.max(0, holdUntilTime.getTime() - now.getTime());
      const remainingSeconds = Math.floor(remaining / 1000);
      
      setTimeRemaining(remainingSeconds);
      
      if (remainingSeconds <= 0 && isActive) {
        setIsActive(false);
        // Add small delay before calling onComplete to prevent errors
        setTimeout(() => {
          onComplete?.();
        }, 100);
        
        // Fade out animation
        opacity.value = withTiming(0, { duration: 500 });
      }
      
      return remainingSeconds;
    };

    // Initial calculation
    calculateTimeRemaining();

    // Update every second
    const interval = setInterval(() => {
      calculateTimeRemaining();
    }, 1000);

    return () => clearInterval(interval);
  }, [holdUntil, createdAt, isActive, onComplete]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: styles.smallContainer,
          text: styles.smallText,
          icon: 10,
        };
      case 'large':
        return {
          container: styles.largeContainer,
          text: styles.largeText,
          icon: 16,
        };
      default:
        return {
          container: styles.mediumContainer,
          text: styles.mediumText,
          icon: 12,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: opacity.value,
  }));

  if (!isActive || timeRemaining <= 0) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, sizeStyles.container, animatedStyle]}>
      <Timer color="#E74C3C" size={sizeStyles.icon} />
      <Text style={[styles.timerText, sizeStyles.text]}>
        {formatTime(timeRemaining)}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    gap: 4,
  },
  smallContainer: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  mediumContainer: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  largeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  timerText: {
    color: '#E74C3C',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  smallText: {
    fontSize: 9,
  },
  mediumText: {
    fontSize: 10,
  },
  largeText: {
    fontSize: 12,
  },
});