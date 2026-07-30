import type { ProgressionSuggestion } from '../schemas/training';

export interface CompletedSetSummary {
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
}

export interface DoubleProgressionInput {
  exerciseName: string;
  targetRepLow: number;
  targetRepHigh: number;
  incrementKg: number;
  lastSessionSets: CompletedSetSummary[];
}

/**
 * Classic double-progression: if every working set hit the top of the rep range, add load and
 * reset to the bottom of the range next time. If any set fell below the bottom of the range (or
 * average RPE was very high), suggest holding weight or deloading instead of pushing forward.
 */
export function computeDoubleProgression(input: DoubleProgressionInput): ProgressionSuggestion {
  const { exerciseName, targetRepLow, targetRepHigh, incrementKg, lastSessionSets } = input;
  const workingSets = lastSessionSets.filter((s) => s.reps !== null && s.weightKg !== null);

  if (workingSets.length === 0) {
    return { exerciseName, action: 'hold', detail: 'No logged sets yet - start at the prescribed weight.' };
  }

  const minReps = Math.min(...workingSets.map((s) => s.reps ?? 0));
  const maxWeight = Math.max(...workingSets.map((s) => s.weightKg ?? 0));
  const avgRpe =
    workingSets.filter((s) => s.rpe !== null).reduce((sum, s) => sum + (s.rpe ?? 0), 0) /
    (workingSets.filter((s) => s.rpe !== null).length || 1);

  if (avgRpe >= 9.5) {
    return {
      exerciseName,
      action: 'deload',
      detail: 'Recent sets were near maximal effort - back off load this session to manage fatigue.',
      suggestedWeightKg: Math.max(0, Math.round((maxWeight * 0.9) / 2.5) * 2.5),
    };
  }

  if (minReps >= targetRepHigh) {
    return {
      exerciseName,
      action: 'increase_weight',
      detail: `Hit the top of the rep range (${targetRepHigh}) on every set last time - add ${incrementKg}kg and aim for ${targetRepLow}-${targetRepHigh} reps again.`,
      suggestedWeightKg: maxWeight + incrementKg,
    };
  }

  if (minReps < targetRepLow) {
    return {
      exerciseName,
      action: 'hold',
      detail: `Fell below the rep floor (${targetRepLow}) on at least one set - repeat this weight and focus on hitting the range.`,
      suggestedWeightKg: maxWeight,
    };
  }

  return {
    exerciseName,
    action: 'add_rep',
    detail: `Within range but not yet at the top - same weight, aim for one more rep per set.`,
    suggestedWeightKg: maxWeight,
  };
}
