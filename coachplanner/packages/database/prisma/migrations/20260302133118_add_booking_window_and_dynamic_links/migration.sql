-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "booking_window_minutes" INTEGER NOT NULL DEFAULT 15;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phone_number" TEXT;

-- CreateTable
CREATE TABLE "organization_links" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_links_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "organization_links" ADD CONSTRAINT "organization_links_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
