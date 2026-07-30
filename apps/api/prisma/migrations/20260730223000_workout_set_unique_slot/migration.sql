-- Replace the plain workoutLogId index with a composite unique constraint so a set can be
-- upserted by (workoutLogId, exerciseName, setIndex) instead of always inserting a new row.
DROP INDEX "WorkoutSet_workoutLogId_idx";

CREATE UNIQUE INDEX "WorkoutSet_workoutLogId_exerciseName_setIndex_key" ON "WorkoutSet"("workoutLogId", "exerciseName", "setIndex");
