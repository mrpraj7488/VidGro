import { Tabs } from 'expo-router';
import { Play, TrendingUp, ChartBar as BarChart3, MoveHorizontal as MoreHorizontal } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Platform, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

export default function TabLayout() {
  const { colors, isDark } = useTheme();

  // Animation for blur effect
  const blurOpacity = useSharedValue(1);

  const blurAnimatedStyle = useAnimatedStyle(() => ({
    opacity: blurOpacity.value,
  }));

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: isDark ? colors.tabBarBackground : colors.tabBarBackground,
            borderTopWidth: 0, // Remove the hard line
            paddingBottom: Platform.OS === 'ios' ? 20 : 8,
            paddingTop: 8,
            height: Platform.OS === 'ios' ? 85 : 70,
            position: 'relative',
            ...Platform.select({
              ios: {
                shadowColor: isDark ? colors.shadowColor : colors.shadowColor,
                shadowOffset: { width: 0, height: -8 },
                shadowOpacity: isDark ? 0.4 : 0.15,
                shadowRadius: 16,
              },
              android: {
                elevation: 12,
              },
              web: {
                boxShadow: isDark 
                  ? '0 -8px 32px rgba(0, 0, 0, 0.4)' 
                  : '0 -8px 32px rgba(0, 0, 0, 0.15)',
              },
            }),
          },
          tabBarActiveTintColor: isDark ? colors.primary : colors.primary,
          tabBarInactiveTintColor: isDark ? colors.textSecondary : colors.textSecondary,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginBottom: Platform.OS === 'ios' ? 0 : 4,
          },
          tabBarIconStyle: {
            marginTop: Platform.OS === 'ios' ? 4 : 2,
          },
          tabBarBackground: () => (
            <View style={{ flex: 1, position: 'relative' }}>
              {/* Blur effect above tab bar */}
              <Animated.View style={[
                {
                  position: 'absolute',
                  top: -20,
                  left: 0,
                  right: 0,
                  height: 20,
                },
                blurAnimatedStyle
              ]}>
                <LinearGradient
                  colors={isDark 
                    ? ['transparent', 'rgba(10, 14, 26, 0.8)', 'rgba(10, 14, 26, 0.95)']
                    : ['transparent', 'rgba(245, 245, 245, 0.8)', 'rgba(245, 245, 245, 0.95)']
                  }
                  style={{ flex: 1 }}
                  locations={[0, 0.3, 1]}
                />
              </Animated.View>
              
              {/* Tab bar background */}
              <LinearGradient
                colors={isDark 
                  ? [colors.tabBarBackground, 'rgba(10, 14, 26, 0.98)']
                  : [colors.tabBarBackground, 'rgba(250, 250, 250, 0.98)']
                }
                style={{ flex: 1 }}
              />
            </View>
          ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'View',
            tabBarIcon: ({ size, color }) => (
              <Play size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="promote"
          options={{
            title: 'Promote',
            tabBarIcon: ({ size, color }) => (
              <TrendingUp size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            title: 'Analytics',
            tabBarIcon: ({ size, color }) => (
              <BarChart3 size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: 'More',
            tabBarIcon: ({ size, color }) => (
              <MoreHorizontal size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
