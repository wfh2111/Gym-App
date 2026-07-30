import type { User, Profile } from '@prisma/client';
import type { AuthUser } from '@gym-app/shared';

export function toAuthUser(user: User & { profile: Profile | null }): AuthUser {
  return {
    id: user.id,
    email: user.email,
    timezone: user.timezone,
    onboardingCompletedAt: user.profile?.onboardingCompletedAt?.toISOString() ?? null,
  };
}
