import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/lib/authStore';
import { configurePurchases } from '@/lib/purchases';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { colors, scheme } = useTheme();
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const status = useAuthStore((s) => s.status);
  const userId = useAuthStore((s) => s.user?.id);
  const purchasesConfiguredFor = useRef<string | null>(null);

  useEffect(() => {
    hydrate().finally(() => {
      SplashScreen.hideAsync().catch(() => {});
    });
  }, [hydrate]);

  useEffect(() => {
    if (userId && purchasesConfiguredFor.current !== userId) {
      purchasesConfiguredFor.current = userId;
      configurePurchases(userId).catch((err) => console.warn('Failed to configure purchases:', err));
    }
  }, [userId]);

  if (status === 'loading') return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RootNavigator />
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
