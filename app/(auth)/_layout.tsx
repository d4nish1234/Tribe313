import { Stack } from 'expo-router';
import { useAuthGate } from '@/src/hooks/useAuthGate';

export default function AuthLayout() {
  useAuthGate();
  return <Stack screenOptions={{ headerShown: false }} />;
}
