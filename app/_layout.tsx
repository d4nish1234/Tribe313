import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AuthProvider } from '@/src/contexts/AuthContext';
import { lightTheme } from '@/src/theme';

const queryClient = new QueryClient();

export default function RootLayout() {
  // Screens don't set explicit backgrounds yet, so they assume a light surface.
  // Following the device's dark-mode setting here would put dark-theme's light
  // text colors on those (still-light) backgrounds. Force light until screens
  // are made dark-mode aware.
  const theme = lightTheme;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={theme}>
          <AuthProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(gate)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="event/[id]" options={{ headerShown: true, title: 'Event' }} />
              <Stack.Screen name="event/new" options={{ headerShown: true, title: 'New event', presentation: 'modal' }} />
              <Stack.Screen name="admin/approvals" options={{ headerShown: true, title: 'Approvals' }} />
              <Stack.Screen name="admin/carpool-addresses" options={{ headerShown: true, title: 'Carpool locations' }} />
            </Stack>
            <StatusBar style="dark" />
          </AuthProvider>
        </PaperProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
