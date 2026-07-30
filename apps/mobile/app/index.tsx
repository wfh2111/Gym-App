import { Redirect } from 'expo-router';
import { useAuthStore } from '@/lib/authStore';

/** True root ("/"). Route groups like (auth) and (app) don't occupy a URL segment, so this is
 *  the only thing that ever matches "/" - it just routes onward based on auth/onboarding state. */
export default function Index() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  if (status !== 'signedIn') return <Redirect href="/(auth)/login" />;
  if (!user?.onboardingCompletedAt) return <Redirect href="/onboarding/chat" />;
  return <Redirect href="/(app)/today" />;
}
