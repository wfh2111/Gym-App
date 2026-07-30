import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/lib/authStore';

export default function AuthLayout() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  if (status === 'signedIn') {
    return <Redirect href={user?.onboardingCompletedAt ? '/(app)/today' : '/onboarding/chat'} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
