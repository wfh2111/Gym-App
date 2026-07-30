import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { startOfDay, startOfWeek } from '../src/lib/date';

const prisma = new PrismaClient();

const EXERCISE_CATALOG: { name: string; primaryMuscle: string; equipment: string }[] = [
  { name: 'Barbell Back Squat', primaryMuscle: 'Quads', equipment: 'Barbell' },
  { name: 'Barbell Bench Press', primaryMuscle: 'Chest', equipment: 'Barbell' },
  { name: 'Conventional Deadlift', primaryMuscle: 'Posterior Chain', equipment: 'Barbell' },
  { name: 'Overhead Press', primaryMuscle: 'Shoulders', equipment: 'Barbell' },
  { name: 'Barbell Row', primaryMuscle: 'Back', equipment: 'Barbell' },
  { name: 'Pull-Up', primaryMuscle: 'Back', equipment: 'Bodyweight' },
  { name: 'Dumbbell Incline Press', primaryMuscle: 'Chest', equipment: 'Dumbbell' },
  { name: 'Dumbbell Romanian Deadlift', primaryMuscle: 'Hamstrings', equipment: 'Dumbbell' },
  { name: 'Walking Lunge', primaryMuscle: 'Quads', equipment: 'Dumbbell' },
  { name: 'Lat Pulldown', primaryMuscle: 'Back', equipment: 'Cable' },
  { name: 'Seated Cable Row', primaryMuscle: 'Back', equipment: 'Cable' },
  { name: 'Leg Press', primaryMuscle: 'Quads', equipment: 'Machine' },
  { name: 'Leg Curl', primaryMuscle: 'Hamstrings', equipment: 'Machine' },
  { name: 'Dumbbell Lateral Raise', primaryMuscle: 'Shoulders', equipment: 'Dumbbell' },
  { name: 'Cable Triceps Pushdown', primaryMuscle: 'Triceps', equipment: 'Cable' },
  { name: 'Dumbbell Biceps Curl', primaryMuscle: 'Biceps', equipment: 'Dumbbell' },
  { name: 'Plank', primaryMuscle: 'Core', equipment: 'Bodyweight' },
  { name: 'Push-Up', primaryMuscle: 'Chest', equipment: 'Bodyweight' },
  { name: 'Goblet Squat', primaryMuscle: 'Quads', equipment: 'Dumbbell' },
  { name: 'Hip Thrust', primaryMuscle: 'Glutes', equipment: 'Barbell' },
];

async function main() {
  console.log('Seeding exercise catalog...');
  for (const exercise of EXERCISE_CATALOG) {
    await prisma.exerciseCatalog.upsert({
      where: { name: exercise.name },
      update: {},
      create: exercise,
    });
  }

  const demoEmail = 'demo@gymapp.dev';
  const demoPassword = 'password123';
  console.log(`Seeding demo user ${demoEmail} / ${demoPassword} ...`);

  const passwordHash = await bcrypt.hash(demoPassword, 10);
  const user = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: {
      email: demoEmail,
      passwordHash,
      timezone: 'America/New_York',
    },
  });

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      goal: 'MUSCLE_GAIN',
      experienceLevel: 'INTERMEDIATE',
      trainingHistoryNotes: 'Lifting consistently for 3 years, comfortable with all major barbell lifts.',
      daysPerWeek: 4,
      sessionDurationMinutes: 60,
      equipmentAccess: 'FULL_GYM',
      dietPattern: 'OMNIVORE',
      dietaryRestrictions: [],
      allergies: [],
      heightCm: 178,
      currentWeightKg: 78,
      targetWeightKg: 82,
      sex: 'male',
      birthYear: 1996,
      activityLevel: 'moderate',
      sleepHoursAvg: 7,
      sleepQualityNotes: 'Generally consistent, occasional late nights before big workdays.',
      injuries: [{ bodyPart: 'left shoulder', description: 'Mild impingement, avoid heavy overhead pressing past 90 degrees', severity: 'MILD' }],
      supplementOpenness: 'OPEN_BASIC',
      onboardingCompletedAt: new Date(),
    },
  });

  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      tier: 'FREE',
      status: 'NONE',
      isAnnual: false,
    },
  });

  const existingPlan = await prisma.planVersion.findFirst({ where: { userId: user.id, status: 'ACTIVE' } });
  if (!existingPlan) {
    console.log('Seeding an active plan version...');
    const weekStart = startOfWeek(new Date());

    const plan = await prisma.planVersion.create({
      data: {
        userId: user.id,
        versionNumber: 1,
        status: 'ACTIVE',
        weekStartDate: weekStart,
        rationale:
          'Intermediate lifter chasing muscle gain with 4 days/week and full gym access, so this plan leans into a moderate surplus and an Upper/Lower split with double-progression, while working around a mild left shoulder issue by capping overhead pressing range.',
        sourceModel: 'seed',
        nutritionTarget: {
          create: {
            calories: 2950,
            proteinG: 175,
            carbsG: 340,
            fatG: 90,
            mealsPerDay: 4,
            mealTimingNotes: 'Protein at every meal; put ~30% of daily carbs around your training window.',
          },
        },
        recoveryProtocol: {
          create: {
            sleepTargetHours: 7.5,
            deloadCadenceWeeks: 6,
            mobilityRoutineNotes: '10 minutes of hip and shoulder mobility on training days, longer walk-based recovery on rest days.',
          },
        },
        supplementSuggestions: {
          create: [
            {
              category: 'PROTEIN',
              rationale: 'Whey or plant protein makes it easier to consistently hit your daily protein target.',
            },
            {
              category: 'CREATINE',
              rationale: '5g/day of creatine monohydrate is one of the most well-studied aids for strength and lean mass gain.',
            },
            {
              category: 'VITAMIN_D',
              rationale: 'Common shortfall for indoor gym-goers; worth checking levels with a healthcare provider.',
            },
          ],
        },
        trainingProgram: {
          create: {
            splitType: 'Upper/Lower',
            notes: 'Overhead pressing capped below shoulder height due to left shoulder impingement.',
            days: {
              create: [
                {
                  dayIndex: 0,
                  label: 'Upper A',
                  focus: 'Push-focused upper body',
                  isRestDay: false,
                  exercises: {
                    create: [
                      { order: 1, exerciseName: 'Barbell Bench Press', targetSets: 4, targetRepLow: 6, targetRepHigh: 8, targetRIR: 2, restSeconds: 150, progressionRule: { type: 'double_progression', incrementKg: 2.5 } },
                      { order: 2, exerciseName: 'Barbell Row', targetSets: 4, targetRepLow: 8, targetRepHigh: 10, targetRIR: 2, restSeconds: 120, progressionRule: { type: 'double_progression', incrementKg: 2.5 } },
                      { order: 3, exerciseName: 'Dumbbell Incline Press', targetSets: 3, targetRepLow: 10, targetRepHigh: 12, targetRIR: 2, restSeconds: 90, progressionRule: { type: 'double_progression', incrementKg: 2 } },
                      { order: 4, exerciseName: 'Cable Triceps Pushdown', targetSets: 3, targetRepLow: 12, targetRepHigh: 15, targetRIR: 1, restSeconds: 60, progressionRule: { type: 'double_progression', incrementKg: 2 } },
                    ],
                  },
                },
                {
                  dayIndex: 1,
                  label: 'Lower A',
                  focus: 'Quad-dominant',
                  isRestDay: false,
                  exercises: {
                    create: [
                      { order: 1, exerciseName: 'Barbell Back Squat', targetSets: 4, targetRepLow: 5, targetRepHigh: 8, targetRIR: 2, restSeconds: 180, progressionRule: { type: 'double_progression', incrementKg: 2.5 } },
                      { order: 2, exerciseName: 'Leg Press', targetSets: 3, targetRepLow: 10, targetRepHigh: 12, targetRIR: 2, restSeconds: 120, progressionRule: { type: 'double_progression', incrementKg: 5 } },
                      { order: 3, exerciseName: 'Leg Curl', targetSets: 3, targetRepLow: 10, targetRepHigh: 12, targetRIR: 1, restSeconds: 90, progressionRule: { type: 'double_progression', incrementKg: 2 } },
                      { order: 4, exerciseName: 'Plank', targetSets: 3, targetRepLow: 30, targetRepHigh: 60, targetRIR: 1, restSeconds: 60 },
                    ],
                  },
                },
                { dayIndex: 2, label: 'Rest', isRestDay: true, exercises: { create: [] } },
                {
                  dayIndex: 3,
                  label: 'Upper B',
                  focus: 'Pull-focused upper body',
                  isRestDay: false,
                  exercises: {
                    create: [
                      { order: 1, exerciseName: 'Pull-Up', targetSets: 4, targetRepLow: 6, targetRepHigh: 10, targetRIR: 2, restSeconds: 150, progressionRule: { type: 'double_progression', incrementKg: 1.25 } },
                      { order: 2, exerciseName: 'Overhead Press', targetSets: 3, targetRepLow: 8, targetRepHigh: 10, targetRIR: 2, restSeconds: 120, progressionRule: { type: 'double_progression', incrementKg: 1.25 } },
                      { order: 3, exerciseName: 'Seated Cable Row', targetSets: 3, targetRepLow: 10, targetRepHigh: 12, targetRIR: 2, restSeconds: 90, progressionRule: { type: 'double_progression', incrementKg: 2.5 } },
                      { order: 4, exerciseName: 'Dumbbell Biceps Curl', targetSets: 3, targetRepLow: 10, targetRepHigh: 12, targetRIR: 1, restSeconds: 60, progressionRule: { type: 'double_progression', incrementKg: 1 } },
                    ],
                  },
                },
                {
                  dayIndex: 4,
                  label: 'Lower B',
                  focus: 'Hip-hinge-dominant',
                  isRestDay: false,
                  exercises: {
                    create: [
                      { order: 1, exerciseName: 'Conventional Deadlift', targetSets: 3, targetRepLow: 4, targetRepHigh: 6, targetRIR: 2, restSeconds: 180, progressionRule: { type: 'double_progression', incrementKg: 5 } },
                      { order: 2, exerciseName: 'Hip Thrust', targetSets: 3, targetRepLow: 8, targetRepHigh: 10, targetRIR: 2, restSeconds: 120, progressionRule: { type: 'double_progression', incrementKg: 5 } },
                      { order: 3, exerciseName: 'Walking Lunge', targetSets: 3, targetRepLow: 10, targetRepHigh: 12, targetRIR: 2, restSeconds: 90, progressionRule: { type: 'double_progression', incrementKg: 2 } },
                      { order: 4, exerciseName: 'Dumbbell Lateral Raise', targetSets: 3, targetRepLow: 12, targetRepHigh: 15, targetRIR: 1, restSeconds: 60, progressionRule: { type: 'double_progression', incrementKg: 1 } },
                    ],
                  },
                },
                { dayIndex: 5, label: 'Rest', isRestDay: true, exercises: { create: [] } },
                { dayIndex: 6, label: 'Rest', isRestDay: true, exercises: { create: [] } },
              ],
            },
          },
        },
      },
    });

    console.log(`Created plan version ${plan.id}`);
  }

  console.log('Seeding a few days of nutrition and recovery history...');
  const today = new Date();
  for (let i = 1; i <= 5; i++) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);

    await prisma.nutritionLog.createMany({
      data: [
        { userId: user.id, loggedAt: atTime(day, 8), mealType: 'BREAKFAST', source: 'MANUAL', description: 'Greek yogurt, oats, berries', calories: 520, proteinG: 38, carbsG: 62, fatG: 12 },
        { userId: user.id, loggedAt: atTime(day, 13), mealType: 'LUNCH', source: 'MANUAL', description: 'Chicken breast, rice, broccoli', calories: 720, proteinG: 55, carbsG: 80, fatG: 15 },
        { userId: user.id, loggedAt: atTime(day, 19), mealType: 'DINNER', source: 'MANUAL', description: 'Salmon, potatoes, salad', calories: 780, proteinG: 48, carbsG: 70, fatG: 28 },
      ],
    });

    await prisma.recoveryData.upsert({
      where: { userId_date_source: { userId: user.id, date: startOfDay(day), source: 'MANUAL' } },
      update: {},
      create: {
        userId: user.id,
        date: startOfDay(day),
        source: 'MANUAL',
        sleepHours: 6.5 + Math.random() * 1.5,
        sleepQualityScore: 60 + Math.random() * 30,
        recoveryScore: 55 + Math.random() * 35,
      },
    });
  }

  console.log('Seed complete.');
  console.log(`Login with: ${demoEmail} / ${demoPassword}`);
}

function atTime(date: Date, hour: number): Date {
  const d = new Date(date);
  d.setHours(hour, 0, 0, 0);
  return d;
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
