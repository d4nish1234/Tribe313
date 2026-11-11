import { Stack } from 'expo-router';
import { ThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AuthProvider } from '@/src/contexts/AuthContext';
import { lightTheme, navTheme } from '@/src/theme';

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
          <ThemeProvider value={navTheme}>
            <AuthProvider>
              {/* dangerouslySingular: pushing a screen that's already open (a double
                  tap, a tap registered twice) reuses it instead of stacking a copy
                  that makes Back look broken. Keyed by route + params. */}
              <Stack
                // SDK 58 makes the iOS 26 header transparent (Liquid Glass) with
                // content scrolling under it; our screens assume a solid header.
                screenOptions={{ headerShown: false, headerBackTitle: 'Back', headerTransparent: false }}
              >
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(gate)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="event/[id]" dangerouslySingular options={{ headerShown: true, title: 'Event' }} />
                <Stack.Screen name="event/new" dangerouslySingular options={{ headerShown: true, title: 'New event', presentation: 'modal' }} />
                <Stack.Screen name="admin/approvals" dangerouslySingular options={{ headerShown: true, title: 'Approvals' }} />
                <Stack.Screen name="admin/carpool-addresses" dangerouslySingular options={{ headerShown: true, title: 'Carpool locations' }} />
                <Stack.Screen name="benchmark/entry/[date]" dangerouslySingular options={{ headerShown: true, title: 'Benchmark', headerBackTitle: 'Back' }} />
                <Stack.Screen name="benchmark/plan" dangerouslySingular options={{ headerShown: true, title: 'Your plan', headerBackTitle: 'Back' }} />
                <Stack.Screen name="benchmark/coach/index" dangerouslySingular options={{ headerShown: true, title: 'Coach', headerBackTitle: 'Back' }} />
                <Stack.Screen name="benchmark/coach/[uid]" dangerouslySingular options={{ headerShown: true, title: 'Member', headerBackTitle: 'Back' }} />
              </Stack>
              <StatusBar style="dark" />
            </AuthProvider>
          </ThemeProvider>
        </PaperProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
