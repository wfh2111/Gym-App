export interface PlanRegenerationResult {
  usersProcessed: number;
  usersFailed: number;
}

export async function regenerateAllPlans(): Promise<PlanRegenerationResult> {
  // implemented in Phase 10, once adherence + recovery data feed into plan generation
  return { usersProcessed: 0, usersFailed: 0 };
}
