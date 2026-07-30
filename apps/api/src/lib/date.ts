export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Monday-based week start. */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

/** Monday-based day index (0=Monday..6=Sunday), matching TrainingDay.dayIndex. */
export function dayIndexForDate(date: Date): number {
  return (date.getDay() + 6) % 7;
}
