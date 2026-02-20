-- DropForeignKey
ALTER TABLE "class_sessions" DROP CONSTRAINT "class_sessions_category_id_fkey";

-- AlterTable
ALTER TABLE "class_sessions" ALTER COLUMN "category_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
