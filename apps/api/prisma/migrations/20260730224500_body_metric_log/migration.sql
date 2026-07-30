-- CreateTable
CREATE TABLE "BodyMetricLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "BodyMetricLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BodyMetricLog_userId_date_idx" ON "BodyMetricLog"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BodyMetricLog_userId_date_key" ON "BodyMetricLog"("userId", "date");

-- AddForeignKey
ALTER TABLE "BodyMetricLog" ADD CONSTRAINT "BodyMetricLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
