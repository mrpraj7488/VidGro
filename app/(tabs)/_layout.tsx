import { Tabs } from 'expo-router';
import { Megaphone, Play, DollarSign } from 'lucide-react-native';
import { View, StyleSheet } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#EF4444',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: styles.tabLabel,
      }}>
      <Tabs.Screen
        name="promote"
        options={{
          title: 'Promote',
          tabBarIcon: ({ size, color }) => (
            <View style={styles.iconContainer}>
              <Megaphone size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="view"
        options={{
          title: 'View',
          tabBarIcon: ({ size, color }) => (
            <View style={[styles.iconContainer, color === '#EF4444' && styles.activeIconContainer]}>
              <Play size={size} color={color} />
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
              <DollarSign size={size} color={color} />
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
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
    paddingBottom: 8,
    height: 70,
  },
  tabLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    marginTop: 4,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 20,
    padding: 8,
  },
});