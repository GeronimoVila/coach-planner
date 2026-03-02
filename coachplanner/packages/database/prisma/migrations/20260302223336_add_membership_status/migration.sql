-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "memberships" ADD COLUMN     "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE';
