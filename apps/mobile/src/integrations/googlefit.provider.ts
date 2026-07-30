import { Platform } from 'react-native';
import GoogleFit, { Scopes } from 'react-native-google-fit';
import type { NormalizedRecoveryDatum } from '@gym-app/shared';

/** Requires a custom dev client (`expo prebuild`) - Google Fit is a native module not present in
 *  Expo Go, so this is only exercised on a real build. */
export const isGoogleFitSupported = Platform.OS === 'android';

// Google Fit sleep-segment types: 1=awake, 2=sleep, 3=out-of-bed, 4=light, 5=deep, 6=REM.
// Only the actually-asleep stages count toward sleepHours.
const ASLEEP_STAGES = new Set([2, 4, 5, 6]);

function dateKey(value: string | number): string {
  return new Date(value).toISOString().slice(0, 10);
}

async function authorize(): Promise<void> {
  const result = await GoogleFit.authorize({
    scopes: [Scopes.FITNESS_SLEEP_READ, Scopes.FITNESS_HEART_RATE_READ],
  });
  if (!result.success) throw new Error(result.message);
}

/**
 * Requests Google Fit read access and pulls the last `days` of sleep + resting-heart-rate
 * samples. Google Fit's public API exposes no HRV data type at all, so hrvMs is always left
 * unset here - unlike Whoop/Oura, that's a platform limitation, not an oversight.
 */
export async function fetchRecentGoogleFitRecovery(days: number): Promise<NormalizedRecoveryDatum[]> {
  if (!isGoogleFitSupported) return [];

  await authorize();

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const range = { startDate: startDate.toISOString(), endDate: endDate.toISOString() };

  const [sleepSessions, restingHrSamples] = await Promise.all([
    GoogleFit.getSleepSamples(range, true),
    GoogleFit.getRestingHeartRateSamples(range),
  ]);

  const byDay = new Map<string, NormalizedRecoveryDatum>();
  const row = (date: string): NormalizedRecoveryDatum => {
    let existing = byDay.get(date);
    if (!existing) {
      existing = { date };
      byDay.set(date, existing);
    }
    return existing;
  };

  const sleepHoursByDay = new Map<string, number>();
  for (const session of sleepSessions) {
    const day = dateKey(session.endDate);
    // Some sources only report the session envelope with no stage breakdown - fall back to
    // treating the whole session as asleep time rather than dropping it.
    const segments = session.granularity?.length
      ? session.granularity.filter((g) => ASLEEP_STAGES.has(g.sleepStage))
      : [{ startDate: session.startDate, endDate: session.endDate, sleepStage: 2 }];
    const hours = segments.reduce(
      (sum, seg) => sum + (new Date(seg.endDate).getTime() - new Date(seg.startDate).getTime()) / 3_600_000,
      0,
    );
    sleepHoursByDay.set(day, (sleepHoursByDay.get(day) ?? 0) + hours);
  }
  for (const [day, hours] of sleepHoursByDay) {
    row(day).sleepHours = Math.round(hours * 10) / 10;
  }

  const rhrByDay = new Map<string, number[]>();
  for (const sample of restingHrSamples) {
    const day = dateKey(sample.startDate);
    const list = rhrByDay.get(day) ?? [];
    list.push(sample.value);
    rhrByDay.set(day, list);
  }
  for (const [day, values] of rhrByDay) {
    row(day).restingHeartRate = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }

  return Array.from(byDay.values());
}
