import type { MealType } from '@gym-app/shared';

export function defaultMealTypeForNow(date: Date = new Date()): MealType {
  const hour = date.getHours();
  if (hour < 11) return 'BREAKFAST';
  if (hour < 15) return 'LUNCH';
  if (hour < 21) return 'DINNER';
  return 'SNACK';
}
