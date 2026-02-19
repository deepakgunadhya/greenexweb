/*
  Warnings:

  - A unique constraint covering the columns `[quotation_number]` on the table `quotations` will be added. If there are existing duplicate values, this will fail.
  - Made the column `device_id` on table `device_tokens` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `quotation_number` to the `quotations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `valid_until` to the `quotations` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "quotations" DROP CONSTRAINT "quotations_uploaded_by_fkey";

-- DropIndex
DROP INDEX "quotations_created_at_idx";

-- DropIndex
DROP INDEX "quotations_uploaded_by_idx";

-- AlterTable
ALTER TABLE "device_tokens" ALTER COLUMN "type" DROP DEFAULT,
ALTER COLUMN "device_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by" TEXT,
ADD COLUMN     "client_notes" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "internal_notes" TEXT,
ADD COLUMN     "is_latest" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mime_type" TEXT,
ADD COLUMN     "previous_version" TEXT,
ADD COLUMN     "quotation_number" TEXT NOT NULL,
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "responded_at" TIMESTAMP(3),
ADD COLUMN     "valid_until" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "viewed_at" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'DRAFT',
ALTER COLUMN "uploaded_by" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lead_id" TEXT,
ADD COLUMN     "organization_id" TEXT,
ADD COLUMN     "user_type" TEXT NOT NULL DEFAULT 'INTERNAL';

-- CreateTable
CREATE TABLE "quotation_otps" (
    "id" TEXT NOT NULL,
    "quotation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "otp_code" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quotation_otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_actions" (
    "id" TEXT NOT NULL,
    "quotation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quotation_otps_quotation_id_idx" ON "quotation_otps"("quotation_id");

-- CreateIndex
CREATE INDEX "quotation_otps_user_id_idx" ON "quotation_otps"("user_id");

-- CreateIndex
CREATE INDEX "quotation_otps_expires_at_idx" ON "quotation_otps"("expires_at");

-- CreateIndex
CREATE INDEX "quotation_actions_quotation_id_idx" ON "quotation_actions"("quotation_id");

-- CreateIndex
CREATE INDEX "quotation_actions_user_id_idx" ON "quotation_actions"("user_id");

-- CreateIndex
CREATE INDEX "quotation_actions_action_idx" ON "quotation_actions"("action");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_quotation_number_key" ON "quotations"("quotation_number");

-- CreateIndex
CREATE INDEX "quotations_quotation_number_idx" ON "quotations"("quotation_number");

-- CreateIndex
CREATE INDEX "quotations_valid_until_idx" ON "quotations"("valid_until");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_otps" ADD CONSTRAINT "quotation_otps_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_otps" ADD CONSTRAINT "quotation_otps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_actions" ADD CONSTRAINT "quotation_actions_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_actions" ADD CONSTRAINT "quotation_actions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
