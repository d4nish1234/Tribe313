import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthGate } from '@/src/hooks/useAuthGate';
import { usePushRegistration } from '@/src/hooks/usePushRegistration';
import { HeaderMenu } from '@/src/components/HeaderMenu';
import { useAuth } from '@/src/contexts/AuthContext';
import { useOnboarded } from '@/src/hooks/useOnboarded';

// Training is the first screen; there's no Home tab.
export const unstable_settings = { initialRouteName: 'training' };

export default function TabsLayout() {
  useAuthGate();
  usePushRegistration();
  const { isAdmin, firebaseUser } = useAuth();
  // First run on this phone: onboarding before the tabs. Render nothing while
  // the flag is read (a few ms) so Training doesn't flash and start its listeners.
  const onboarded = useOnboarded(firebaseUser?.uid);
  // Sunday Runs and Members aren't released yet: admins only.
  // `href: null` hides a tab without removing its screen.
  const runs = isAdmin;
  if (onboarded === false) return <Redirect href="/onboarding" />;
  if (onboarded === undefined) return null;
  return (
    <Tabs screenOptions={{ headerShown: true, headerRight: () => <HeaderMenu /> }}>
      <Tabs.Screen
        name="training"
        options={{
          title: 'Training',
          tabBarIcon: ({ color, size }) => <Ionicons name="barbell" color={color as string} size={size} />,
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
        name="benchmark"
        options={{
          title: 'Benchmark',
          tabBarIcon: ({ color, size }) => <Ionicons name="stopwatch" color={color as string} size={size} />,
        }}
      />
    </Tabs>
  );
}
