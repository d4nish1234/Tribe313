import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthGate } from '@/src/hooks/useAuthGate';
import { usePushRegistration } from '@/src/hooks/usePushRegistration';
import { HeaderMenu } from '@/src/components/HeaderMenu';
import { useAuth } from '@/src/contexts/AuthContext';
import { showRuns } from '@/src/lib/features';

export default function TabsLayout() {
  useAuthGate();
  usePushRegistration();
  const { isAdmin } = useAuth();
  // Sunday Runs and Members are built but not released yet: admins only.
  // `href: null` hides a tab without removing its screen.
  const runs = showRuns(isAdmin);
  return (
    <Tabs screenOptions={{ headerShown: true, headerRight: () => <HeaderMenu /> }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Sunday Runs',
          href: runs ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="walk" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          title: 'Members',
          href: runs ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="training"
        options={{
          title: 'Training',
          tabBarIcon: ({ color, size }) => <Ionicons name="barbell" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="benchmark"
        options={{
          title: 'Benchmark',
          tabBarIcon: ({ color, size }) => <Ionicons name="stopwatch" color={color as string} size={size} />,
        }}
      />
    </Tabs>
  );
}
