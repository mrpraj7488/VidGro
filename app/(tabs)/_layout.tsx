import { Tabs } from 'expo-router';
import { Play, Megaphone, ChartBar as BarChart3, User } from 'lucide-react-native';
import { View, StyleSheet } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#FF0000',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: styles.tabLabel,
      }}>
      <Tabs.Screen
        name="view"
        options={{
          title: 'View',
          tabBarIcon: ({ size, color }) => (
            <View style={styles.iconContainer}>
              <Play size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="promote"
        options={{
          title: 'Video Promote',
          tabBarIcon: ({ size, color }) => (
            <View style={styles.iconContainer}>
              <Megaphone size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ size, color }) => (
            <View style={styles.iconContainer}>
              <BarChart3 size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="others"
        options={{
          title: 'Others',
          tabBarIcon: ({ size, color }) => (
            <View style={styles.iconContainer}>
              <User size={size} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    paddingBottom: 8,
    height: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  tabLabel: {
    fontFamily: 'Roboto-Medium',
    fontSize: 12,
    marginTop: 4,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});