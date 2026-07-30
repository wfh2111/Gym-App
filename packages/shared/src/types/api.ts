import type {
  NutritionTarget,
  TrainingProgram,
  TrainingDay,
  PrescribedExercise,
  RecoveryProtocol,
  SupplementSuggestion,
} from '../schemas/plan';
import type {
  MealType,
  NutritionSource,
  PlanStatus,
  MessageRole,
  ConversationType,
  SubscriptionTier,
  SubscriptionStatus,
  WearableProvider,
  ConnectionStatus,
} from '../schemas/enums';
import type { ProgressionSuggestion } from '../schemas/training';

export interface PlanVersionDTO {
  id: string;
  versionNumber: number;
  status: PlanStatus;
  weekStartDate: string;
  rationale: string | null;
  generatedAt: string;
  nutritionTarget: NutritionTarget | null;
  trainingProgram: (Omit<TrainingProgram, 'days'> & { days: (TrainingDay & { id: string })[] }) | null;
  recoveryProtocol: RecoveryProtocol | null;
  supplementSuggestions: (SupplementSuggestion & { id: string; disclaimer: string })[];
}

export interface NutritionLogDTO {
  id: string;
  loggedAt: string;
  mealType: MealType;
  source: NutritionSource;
  description: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface NutritionSummaryDTO {
  date: string;
  target: NutritionTarget | null;
  consumed: { calories: number; proteinG: number; carbsG: number; fatG: number };
  logs: NutritionLogDTO[];
}

export interface WorkoutSetDTO {
  id: string;
  exerciseName: string;
  setIndex: number;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  isWarmup: boolean;
}

export interface WorkoutLogDTO {
  id: string;
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
  trainingDayId: string | null;
  sets: WorkoutSetDTO[];
}

export interface TodayTrainingDayDTO {
  trainingDayId: string;
  label: string;
  focus: string | null;
  isRestDay: boolean;
  exercises: (PrescribedExercise & { suggestion?: ProgressionSuggestion })[];
  activeWorkoutLogId: string | null;
}

export interface TodayResponseDTO {
  streakDays: number;
  nextMeal: { mealType: MealType; caloriesRemaining: number } | null;
  training: TodayTrainingDayDTO | null;
  coachTip: string | null;
}

export type ProgressMetric = 'weight' | 'strength' | 'recovery' | 'adherence';

export interface ProgressTrendPointDTO {
  date: string;
  value: number;
  label?: string;
}

export interface ProgressTrendsDTO {
  metric: ProgressMetric;
  points: ProgressTrendPointDTO[];
}

export interface EntitlementDTO {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  isAnnual: boolean;
  currentPeriodEnd: string | null;
  coachMessagesUsedThisWeek: number;
  coachMessagesLimitPerWeek: number | null;
}

export interface CoachMessageDTO {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface ConversationDTO {
  id: string;
  type: ConversationType;
  status: 'ACTIVE' | 'COMPLETED';
  messages: CoachMessageDTO[];
}

export interface WearableConnectionDTO {
  provider: WearableProvider;
  status: ConnectionStatus;
  connectedAt: string;
}
