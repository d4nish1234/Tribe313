import { Stack } from 'expo-router';
import { useAuthGate } from '@/src/hooks/useAuthGate';

export default function GateLayout() {
  useAuthGate();
  return <Stack screenOptions={{ headerShown: false }} />;
}
