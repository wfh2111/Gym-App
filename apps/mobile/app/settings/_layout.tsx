import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/lib/authStore';

export default function SettingsLayout() {
  const status = useAuthStore((s) => s.status);
  if (status !== 'signedIn') return <Redirect href="/(auth)/login" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
