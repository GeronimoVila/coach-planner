/*
  Warnings:

  - You are about to drop the column `category_id` on the `class_sessions` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "class_sessions" DROP CONSTRAINT "class_sessions_category_id_fkey";

-- AlterTable
ALTER TABLE "class_sessions" DROP COLUMN "category_id";

-- CreateTable
CREATE TABLE "class_category_pivot" (
    "class_session_id" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,

    CONSTRAINT "class_category_pivot_pkey" PRIMARY KEY ("class_session_id","category_id")
);

-- AddForeignKey
ALTER TABLE "class_category_pivot" ADD CONSTRAINT "class_category_pivot_class_session_id_fkey" FOREIGN KEY ("class_session_id") REFERENCES "class_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_category_pivot" ADD CONSTRAINT "class_category_pivot_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
