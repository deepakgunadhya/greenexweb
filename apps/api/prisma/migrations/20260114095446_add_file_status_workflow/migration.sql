-- AlterTable
ALTER TABLE "checklist_item_files" ADD COLUMN     "is_locked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "locked_at" TIMESTAMP(3),
ADD COLUMN     "review_remarks" TEXT,
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'uploaded',
ADD COLUMN     "submitted_at" TIMESTAMP(3),
ADD COLUMN     "submitted_by" TEXT,
ADD COLUMN     "verified_at" TIMESTAMP(3),
ADD COLUMN     "verified_by" TEXT;

-- AlterTable
ALTER TABLE "project_checklists" ALTER COLUMN "status" SET DEFAULT 'assigned';

-- CreateIndex
CREATE INDEX "checklist_item_files_status_idx" ON "checklist_item_files"("status");

-- AddForeignKey
ALTER TABLE "checklist_item_files" ADD CONSTRAINT "checklist_item_files_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_item_files" ADD CONSTRAINT "checklist_item_files_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_item_files" ADD CONSTRAINT "checklist_item_files_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
