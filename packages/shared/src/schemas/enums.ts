import { z } from 'zod';

export const GoalSchema = z.enum([
  'FAT_LOSS',
  'MUSCLE_GAIN',
  'RECOMP',
  'PERFORMANCE',
  'GENERAL_HEALTH',
]);
export type Goal = z.infer<typeof GoalSchema>;

export const ExperienceLevelSchema = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);
export type ExperienceLevel = z.infer<typeof ExperienceLevelSchema>;

export const EquipmentAccessSchema = z.enum([
  'FULL_GYM',
  'HOME_GYM',
  'MINIMAL_EQUIPMENT',
  'BODYWEIGHT_ONLY',
]);
export type EquipmentAccess = z.infer<typeof EquipmentAccessSchema>;

export const DietPatternSchema = z.enum([
  'OMNIVORE',
  'VEGETARIAN',
  'VEGAN',
  'PESCATARIAN',
  'KETO',
  'OTHER',
]);
export type DietPattern = z.infer<typeof DietPatternSchema>;

export const SupplementOpennessSchema = z.enum(['NONE', 'OPEN_BASIC', 'OPEN_ADVANCED']);
export type SupplementOpenness = z.infer<typeof SupplementOpennessSchema>;

export const PlanStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']);
export type PlanStatus = z.infer<typeof PlanStatusSchema>;

export const NutritionSourceSchema = z.enum(['TEXT', 'PHOTO', 'BARCODE', 'MANUAL']);
export type NutritionSource = z.infer<typeof NutritionSourceSchema>;

export const MealTypeSchema = z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']);
export type MealType = z.infer<typeof MealTypeSchema>;

export const RecoverySourceSchema = z.enum([
  'MANUAL',
  'APPLE_HEALTH',
  'GOOGLE_FIT',
  'WHOOP',
  'OURA',
  'GARMIN',
]);
export type RecoverySource = z.infer<typeof RecoverySourceSchema>;

export const WearableProviderSchema = z.enum(['WHOOP', 'OURA', 'GARMIN', 'APPLE_HEALTH', 'GOOGLE_FIT']);
export type WearableProvider = z.infer<typeof WearableProviderSchema>;

export const ConnectionStatusSchema = z.enum(['CONNECTED', 'EXPIRED', 'REVOKED']);
export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;

export const SubscriptionTierSchema = z.enum(['FREE', 'PREMIUM']);
export type SubscriptionTier = z.infer<typeof SubscriptionTierSchema>;

export const SubscriptionStatusSchema = z.enum([
  'ACTIVE',
  'TRIALING',
  'EXPIRED',
  'CANCELED',
  'GRACE_PERIOD',
  'NONE',
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const ConversationTypeSchema = z.enum(['ONBOARDING', 'COACH', 'WEEKLY_CHECKIN']);
export type ConversationType = z.infer<typeof ConversationTypeSchema>;

export const MessageRoleSchema = z.enum(['USER', 'ASSISTANT', 'SYSTEM']);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

export const SupplementCategorySchema = z.enum([
  'PROTEIN',
  'CREATINE',
  'VITAMIN_D',
  'OMEGA3',
  'MAGNESIUM',
  'CAFFEINE',
  'MULTIVITAMIN',
  'ELECTROLYTES',
  'OTHER',
]);
export type SupplementCategory = z.infer<typeof SupplementCategorySchema>;
