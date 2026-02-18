-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('FREE', 'PRO');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "plan" "PlanType" NOT NULL DEFAULT 'FREE';

-- CreateTable
CREATE TABLE "PlanLimits" (
    "id" TEXT NOT NULL,
    "plan" "PlanType" NOT NULL,
    "maxStudents" INTEGER NOT NULL DEFAULT 5,
    "maxCategories" INTEGER NOT NULL DEFAULT 2,
    "maxClasses" INTEGER NOT NULL DEFAULT 10,
    "canExportData" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanLimits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanLimits_plan_key" ON "PlanLimits"("plan");
