import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/lib/authStore';

export default function OnboardingLayout() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  if (status !== 'signedIn') return <Redirect href="/(auth)/login" />;
  if (user?.onboardingCompletedAt) return <Redirect href="/(app)/today" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
