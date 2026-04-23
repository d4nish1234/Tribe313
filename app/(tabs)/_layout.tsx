import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthGate } from '@/src/hooks/useAuthGate';
import { usePushRegistration } from '@/src/hooks/usePushRegistration';
import { usePendingCount } from '@/src/hooks/usePendingCount';

export default function TabsLayout() {
  useAuthGate();
  usePushRegistration();
  const pendingCount = usePendingCount();
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          title: 'Members',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
