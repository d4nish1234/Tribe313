import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AuthProvider } from '@/src/contexts/AuthContext';
import { darkTheme, lightTheme } from '@/src/theme';

const queryClient = new QueryClient();

export default function RootLayout() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? darkTheme : lightTheme;

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
            <StatusBar style="auto" />
          </AuthProvider>
        </PaperProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
