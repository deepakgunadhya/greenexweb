/*
  Warnings:

  - You are about to drop the column `approved_at` on the `quotations` table. All the data in the column will be lost.
  - You are about to drop the column `approved_by` on the `quotations` table. All the data in the column will be lost.
  - You are about to drop the column `client_notes` on the `quotations` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `quotations` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `quotations` table. All the data in the column will be lost.
  - You are about to drop the column `internal_notes` on the `quotations` table. All the data in the column will be lost.
  - You are about to drop the column `is_latest` on the `quotations` table. All the data in the column will be lost.
  - You are about to drop the column `mime_type` on the `quotations` table. All the data in the column will be lost.
  - You are about to drop the column `previous_version` on the `quotations` table. All the data in the column will be lost.
  - You are about to drop the column `quotation_number` on the `quotations` table. All the data in the column will be lost.
  - You are about to drop the column `rejection_reason` on the `quotations` table. All the data in the column will be lost.
  - You are about to drop the column `responded_at` on the `quotations` table. All the data in the column will be lost.
  - You are about to drop the column `total_amount` on the `quotations` table. All the data in the column will be lost.
  - You are about to drop the column `valid_until` on the `quotations` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `quotations` table. All the data in the column will be lost.
  - You are about to drop the column `viewed_at` on the `quotations` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_id]` on the table `google_auth` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user_id` to the `google_auth` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uploaded_by` to the `quotations` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "quotations" DROP CONSTRAINT "quotations_approved_by_fkey";

-- DropIndex
DROP INDEX "quotations_quotation_number_idx";

-- DropIndex
DROP INDEX "quotations_quotation_number_key";

-- DropIndex
DROP INDEX "quotations_valid_until_idx";

-- AlterTable
ALTER TABLE "device_tokens" ALTER COLUMN "type" SET DEFAULT 'broadcast',
ALTER COLUMN "device_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "google_auth" ADD COLUMN     "email" TEXT,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "quotations" DROP COLUMN "approved_at",
DROP COLUMN "approved_by",
DROP COLUMN "client_notes",
DROP COLUMN "currency",
DROP COLUMN "description",
DROP COLUMN "internal_notes",
DROP COLUMN "is_latest",
DROP COLUMN "mime_type",
DROP COLUMN "previous_version",
DROP COLUMN "quotation_number",
DROP COLUMN "rejection_reason",
DROP COLUMN "responded_at",
DROP COLUMN "total_amount",
DROP COLUMN "valid_until",
DROP COLUMN "version",
DROP COLUMN "viewed_at",
ADD COLUMN     "amount" DECIMAL(65,30),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "status_changed_at" TIMESTAMP(3),
ADD COLUMN     "status_changed_by" TEXT,
ADD COLUMN     "uploaded_by" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'UPLOADED';

-- CreateIndex
CREATE UNIQUE INDEX "google_auth_user_id_key" ON "google_auth"("user_id");

-- CreateIndex
CREATE INDEX "google_auth_user_id_idx" ON "google_auth"("user_id");

-- CreateIndex
CREATE INDEX "quotations_uploaded_by_idx" ON "quotations"("uploaded_by");

-- CreateIndex
CREATE INDEX "quotations_created_at_idx" ON "quotations"("created_at");

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_status_changed_by_fkey" FOREIGN KEY ("status_changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
