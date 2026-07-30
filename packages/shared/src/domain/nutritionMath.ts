import type { Profile } from '../schemas/profile';

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** Mifflin-St Jeor estimate. Returns null when required inputs are missing. */
export function estimateTDEE(
  profile: Pick<Profile, 'currentWeightKg' | 'heightCm' | 'birthYear' | 'sex' | 'activityLevel'>,
): number | null {
  const { currentWeightKg, heightCm, birthYear, sex } = profile;
  if (!currentWeightKg || !heightCm || !birthYear || !sex) return null;

  const age = new Date().getFullYear() - birthYear;
  const base = 10 * currentWeightKg + 6.25 * heightCm - 5 * age;
  const bmr = sex.toLowerCase().startsWith('f') ? base - 161 : base + 5;

  const activityKey = profile.activityLevel?.toLowerCase().replace(/\s+/g, '_') ?? 'moderate';
  const multiplier = ACTIVITY_MULTIPLIERS[activityKey] ?? 1.55; // fall back to 'moderate'

  return Math.round(bmr * multiplier);
}

/** Sane calorie bounds for a goal, used to clamp/validate LLM-generated nutrition targets. */
export function calorieBoundsForGoal(
  tdee: number,
  goal: Profile['goal'],
): { min: number; max: number } {
  switch (goal) {
    case 'FAT_LOSS':
      return { min: Math.round(tdee * 0.72), max: Math.round(tdee * 0.88) };
    case 'MUSCLE_GAIN':
      return { min: Math.round(tdee * 1.03), max: Math.round(tdee * 1.2) };
    case 'RECOMP':
      return { min: Math.round(tdee * 0.92), max: Math.round(tdee * 1.03) };
    case 'PERFORMANCE':
    case 'GENERAL_HEALTH':
    default:
      return { min: Math.round(tdee * 0.9), max: Math.round(tdee * 1.1) };
  }
}

/** Sane protein bounds in grams/day, used the same way. 1.6-2.4 g/kg covers all training goals. */
export function proteinBoundsG(currentWeightKg: number | undefined): { min: number; max: number } | null {
  if (!currentWeightKg) return null;
  return { min: Math.round(currentWeightKg * 1.6), max: Math.round(currentWeightKg * 2.4) };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
