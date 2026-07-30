import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/lib/authStore';

/**
 * Deliberately does NOT redirect away once `onboardingCompletedAt` is set: the "generating"
 * screen runs exactly at that completion boundary (profile marked complete, plan not yet
 * built), so gating on completion here would bounce it to Today mid-generation. The rest of
 * the app never links back into /onboarding once a user is fully set up, so leaving these
 * routes reachable post-completion is harmless.
 */
export default function OnboardingLayout() {
  const status = useAuthStore((s) => s.status);

  if (status !== 'signedIn') return <Redirect href="/(auth)/login" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
