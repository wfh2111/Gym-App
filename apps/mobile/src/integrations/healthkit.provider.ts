import { Platform } from 'react-native';
import AppleHealthKit, { type HealthInputOptions, type HealthValue } from 'react-native-health';
import type { NormalizedRecoveryDatum } from '@gym-app/shared';

/** Requires a custom dev client (`expo prebuild`) - HealthKit is a native module not present in
 *  Expo Go, so this is only exercised on a real build. */
export const isHealthKitSupported = Platform.OS === 'ios';

function initHealthKit(): Promise<void> {
  return new Promise((resolve, reject) => {
    AppleHealthKit.initHealthKit(
      {
        permissions: {
          read: [
            AppleHealthKit.Constants.Permissions.SleepAnalysis,
            AppleHealthKit.Constants.Permissions.HeartRateVariability,
            AppleHealthKit.Constants.Permissions.RestingHeartRate,
          ],
          write: [],
        },
      },
      (error) => {
        if (error) reject(new Error(error));
        else resolve();
      },
    );
  });
}

function querySamples(
  method: (options: HealthInputOptions, callback: (err: string, results: HealthValue[]) => void) => void,
  options: HealthInputOptions,
): Promise<HealthValue[]> {
  return new Promise((resolve, reject) => {
    method(options, (err, results) => {
      if (err) reject(new Error(err));
      else resolve(results ?? []);
    });
  });
}

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Requests HealthKit read access and pulls the last `days` of sleep, HRV, and resting-heart-rate
 * samples, collapsing them into one row per calendar day. HealthKit has no single "recovery
 * score" concept the way Whoop/Oura do, so recoveryScore and sleepQualityScore are left unset -
 * the backend only ever sees what the platform actually exposes.
 */
export async function fetchRecentHealthKitRecovery(days: number): Promise<NormalizedRecoveryDatum[]> {
  if (!isHealthKitSupported) return [];

  await initHealthKit();

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const range: HealthInputOptions = { startDate: startDate.toISOString(), endDate: endDate.toISOString() };

  const [sleepSamples, hrvSamples, restingHrSamples] = await Promise.all([
    querySamples(AppleHealthKit.getSleepSamples, range),
    querySamples(AppleHealthKit.getHeartRateVariabilitySamples, {
      ...range,
      unit: AppleHealthKit.Constants.Units.second,
    }),
    querySamples(AppleHealthKit.getRestingHeartRateSamples, { ...range, unit: AppleHealthKit.Constants.Units.bpm }),
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
  for (const sample of sleepSamples) {
    // Sleep-analysis samples carry a category string in `value` (INBED/ASLEEP/CORE/DEEP/REM)
    // despite HealthValue typing it as a number. Only count time actually asleep, and attribute
    // it to the day the person woke up.
    const stage = sample.value as unknown as string;
    if (stage === 'INBED') continue;
    const day = dateKey(sample.endDate);
    const hours = (new Date(sample.endDate).getTime() - new Date(sample.startDate).getTime()) / 3_600_000;
    sleepHoursByDay.set(day, (sleepHoursByDay.get(day) ?? 0) + hours);
  }
  for (const [day, hours] of sleepHoursByDay) {
    row(day).sleepHours = Math.round(hours * 10) / 10;
  }

  const hrvByDay = new Map<string, number[]>();
  for (const sample of hrvSamples) {
    const day = dateKey(sample.startDate);
    const list = hrvByDay.get(day) ?? [];
    list.push(sample.value * 1000); // requested in seconds; store as ms to match the shared schema
    hrvByDay.set(day, list);
  }
  for (const [day, values] of hrvByDay) {
    row(day).hrvMs = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
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
