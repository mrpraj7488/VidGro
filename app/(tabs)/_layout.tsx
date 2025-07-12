import { Tabs } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { CirclePlay as PlayCircle, Users, TrendingUp, ChartBar as BarChart3, Crown } from 'lucide-react-native';

export default function TabLayout() {
  const { profile } = useAuth();
  
  // Check if user has active VIP status
  const isVIPActive = profile?.is_vip && profile?.vip_expires_at && 
    new Date(profile.vip_expires_at) > new Date();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF4757',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 8,
          paddingTop: 8,
          height: 68,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'View',
          tabBarIcon: ({ size, color }) => (
            <PlayCircle size={size} color={color} />
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
            isVIPActive ? (
              <Crown size={size} color="#FFD700" />
            ) : (
              <Users size={size} color={color} />
            )
          ),
        }}
      />
    </Tabs>
  );
}