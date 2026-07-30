-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Goal" AS ENUM ('FAT_LOSS', 'MUSCLE_GAIN', 'RECOMP', 'PERFORMANCE', 'GENERAL_HEALTH');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "EquipmentAccess" AS ENUM ('FULL_GYM', 'HOME_GYM', 'MINIMAL_EQUIPMENT', 'BODYWEIGHT_ONLY');

-- CreateEnum
CREATE TYPE "DietPattern" AS ENUM ('OMNIVORE', 'VEGETARIAN', 'VEGAN', 'PESCATARIAN', 'KETO', 'OTHER');

-- CreateEnum
CREATE TYPE "SupplementOpenness" AS ENUM ('NONE', 'OPEN_BASIC', 'OPEN_ADVANCED');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NutritionSource" AS ENUM ('TEXT', 'PHOTO', 'BARCODE', 'MANUAL');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

-- CreateEnum
CREATE TYPE "RecoverySource" AS ENUM ('MANUAL', 'APPLE_HEALTH', 'GOOGLE_FIT', 'WHOOP', 'OURA', 'GARMIN');

-- CreateEnum
CREATE TYPE "WearableProvider" AS ENUM ('WHOOP', 'OURA', 'GARMIN', 'APPLE_HEALTH', 'GOOGLE_FIT');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('CONNECTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'EXPIRED', 'CANCELED', 'GRACE_PERIOD', 'NONE');

-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('ONBOARDING', 'COACH', 'WEEKLY_CHECKIN');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SupplementCategory" AS ENUM ('PROTEIN', 'CREATINE', 'VITAMIN_D', 'OMEGA3', 'MAGNESIUM', 'CAFFEINE', 'MULTIVITAMIN', 'ELECTROLYTES', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goal" "Goal",
    "experienceLevel" "ExperienceLevel",
    "trainingHistoryNotes" TEXT,
    "daysPerWeek" INTEGER,
    "sessionDurationMinutes" INTEGER,
    "equipmentAccess" "EquipmentAccess",
    "dietPattern" "DietPattern",
    "dietaryRestrictions" TEXT[],
    "allergies" TEXT[],
    "heightCm" DOUBLE PRECISION,
    "currentWeightKg" DOUBLE PRECISION,
    "targetWeightKg" DOUBLE PRECISION,
    "sex" TEXT,
    "birthYear" INTEGER,
    "activityLevel" TEXT,
    "sleepHoursAvg" DOUBLE PRECISION,
    "sleepQualityNotes" TEXT,
    "injuries" JSONB,
    "supplementOpenness" "SupplementOpenness",
    "rawOnboardingTranscript" JSONB,
    "onboardingCompletedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ConversationType" NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "toolCalls" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanVersion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'DRAFT',
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "rationale" TEXT,
    "sourceModel" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionTarget" (
    "id" TEXT NOT NULL,
    "planVersionId" TEXT NOT NULL,
    "calories" INTEGER NOT NULL,
    "proteinG" INTEGER NOT NULL,
    "carbsG" INTEGER NOT NULL,
    "fatG" INTEGER NOT NULL,
    "mealsPerDay" INTEGER NOT NULL,
    "mealTimingNotes" TEXT,

    CONSTRAINT "NutritionTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingProgram" (
    "id" TEXT NOT NULL,
    "planVersionId" TEXT NOT NULL,
    "splitType" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "TrainingProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingDay" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "focus" TEXT,
    "isRestDay" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TrainingDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescribedExercise" (
    "id" TEXT NOT NULL,
    "trainingDayId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "exerciseName" TEXT NOT NULL,
    "exerciseCatalogId" TEXT,
    "targetSets" INTEGER NOT NULL,
    "targetRepLow" INTEGER NOT NULL,
    "targetRepHigh" INTEGER NOT NULL,
    "targetRIR" INTEGER,
    "restSeconds" INTEGER,
    "progressionRule" JSONB,

    CONSTRAINT "PrescribedExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseCatalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primaryMuscle" TEXT NOT NULL,
    "equipment" TEXT NOT NULL,

    CONSTRAINT "ExerciseCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryProtocol" (
    "id" TEXT NOT NULL,
    "planVersionId" TEXT NOT NULL,
    "sleepTargetHours" DOUBLE PRECISION NOT NULL,
    "deloadCadenceWeeks" INTEGER NOT NULL,
    "mobilityRoutineNotes" TEXT,

    CONSTRAINT "RecoveryProtocol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplementSuggestion" (
    "id" TEXT NOT NULL,
    "planVersionId" TEXT NOT NULL,
    "category" "SupplementCategory" NOT NULL,
    "rationale" TEXT NOT NULL,
    "disclaimer" TEXT NOT NULL DEFAULT 'General information only, not medical advice. Consult a qualified healthcare provider before starting any supplement, especially if you take medication or have a medical condition.',

    CONSTRAINT "SupplementSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mealType" "MealType" NOT NULL,
    "source" "NutritionSource" NOT NULL,
    "description" TEXT NOT NULL,
    "calories" INTEGER NOT NULL,
    "proteinG" INTEGER NOT NULL,
    "carbsG" INTEGER NOT NULL,
    "fatG" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION,
    "rawInput" JSONB,

    CONSTRAINT "NutritionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planVersionId" TEXT,
    "trainingDayId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "WorkoutLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSet" (
    "id" TEXT NOT NULL,
    "workoutLogId" TEXT NOT NULL,
    "exerciseName" TEXT NOT NULL,
    "setIndex" INTEGER NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "reps" INTEGER,
    "rpe" DOUBLE PRECISION,
    "isWarmup" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "WorkoutSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryData" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" "RecoverySource" NOT NULL,
    "sleepHours" DOUBLE PRECISION,
    "sleepQualityScore" DOUBLE PRECISION,
    "hrvMs" DOUBLE PRECISION,
    "restingHeartRate" DOUBLE PRECISION,
    "recoveryScore" DOUBLE PRECISION,
    "rawPayload" JSONB,

    CONSTRAINT "RecoveryData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WearableConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "WearableProvider" NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "externalUserId" TEXT,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'CONNECTED',
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WearableConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'revenuecat',
    "revenueCatAppUserId" TEXT,
    "productId" TEXT,
    "entitlementId" TEXT,
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'NONE',
    "isAnnual" BOOLEAN NOT NULL DEFAULT false,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachMessageUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "messageCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CoachMessageUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdherenceSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "nutritionLogDays" INTEGER NOT NULL,
    "workoutsCompleted" INTEGER NOT NULL,
    "workoutsPlanned" INTEGER NOT NULL,
    "avgRecoveryScore" DOUBLE PRECISION,
    "adherencePercent" DOUBLE PRECISION NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdherenceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE INDEX "Conversation_userId_type_idx" ON "Conversation"("userId", "type");

-- CreateIndex
CREATE INDEX "CoachMessage_conversationId_createdAt_idx" ON "CoachMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "PlanVersion_userId_status_idx" ON "PlanVersion"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PlanVersion_userId_versionNumber_key" ON "PlanVersion"("userId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "NutritionTarget_planVersionId_key" ON "NutritionTarget"("planVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingProgram_planVersionId_key" ON "TrainingProgram"("planVersionId");

-- CreateIndex
CREATE INDEX "TrainingDay_programId_dayIndex_idx" ON "TrainingDay"("programId", "dayIndex");

-- CreateIndex
CREATE INDEX "PrescribedExercise_trainingDayId_order_idx" ON "PrescribedExercise"("trainingDayId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseCatalog_name_key" ON "ExerciseCatalog"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RecoveryProtocol_planVersionId_key" ON "RecoveryProtocol"("planVersionId");

-- CreateIndex
CREATE INDEX "NutritionLog_userId_loggedAt_idx" ON "NutritionLog"("userId", "loggedAt");

-- CreateIndex
CREATE INDEX "WorkoutLog_userId_startedAt_idx" ON "WorkoutLog"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "WorkoutSet_workoutLogId_idx" ON "WorkoutSet"("workoutLogId");

-- CreateIndex
CREATE INDEX "WorkoutSet_exerciseName_idx" ON "WorkoutSet"("exerciseName");

-- CreateIndex
CREATE INDEX "RecoveryData_userId_date_idx" ON "RecoveryData"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "RecoveryData_userId_date_source_key" ON "RecoveryData"("userId", "date", "source");

-- CreateIndex
CREATE UNIQUE INDEX "WearableConnection_userId_provider_key" ON "WearableConnection"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachMessageUsage_userId_weekStartDate_key" ON "CoachMessageUsage"("userId", "weekStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "AdherenceSnapshot_userId_weekStartDate_key" ON "AdherenceSnapshot"("userId", "weekStartDate");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachMessage" ADD CONSTRAINT "CoachMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanVersion" ADD CONSTRAINT "PlanVersion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionTarget" ADD CONSTRAINT "NutritionTarget_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "PlanVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingProgram" ADD CONSTRAINT "TrainingProgram_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "PlanVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingDay" ADD CONSTRAINT "TrainingDay_programId_fkey" FOREIGN KEY ("programId") REFERENCES "TrainingProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescribedExercise" ADD CONSTRAINT "PrescribedExercise_trainingDayId_fkey" FOREIGN KEY ("trainingDayId") REFERENCES "TrainingDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescribedExercise" ADD CONSTRAINT "PrescribedExercise_exerciseCatalogId_fkey" FOREIGN KEY ("exerciseCatalogId") REFERENCES "ExerciseCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryProtocol" ADD CONSTRAINT "RecoveryProtocol_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "PlanVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplementSuggestion" ADD CONSTRAINT "SupplementSuggestion_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "PlanVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionLog" ADD CONSTRAINT "NutritionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutLog" ADD CONSTRAINT "WorkoutLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutLog" ADD CONSTRAINT "WorkoutLog_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "PlanVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutLog" ADD CONSTRAINT "WorkoutLog_trainingDayId_fkey" FOREIGN KEY ("trainingDayId") REFERENCES "TrainingDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSet" ADD CONSTRAINT "WorkoutSet_workoutLogId_fkey" FOREIGN KEY ("workoutLogId") REFERENCES "WorkoutLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryData" ADD CONSTRAINT "RecoveryData_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WearableConnection" ADD CONSTRAINT "WearableConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachMessageUsage" ADD CONSTRAINT "CoachMessageUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdherenceSnapshot" ADD CONSTRAINT "AdherenceSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
