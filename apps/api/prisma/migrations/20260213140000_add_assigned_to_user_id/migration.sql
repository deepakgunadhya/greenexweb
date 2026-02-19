-- AlterTable
ALTER TABLE "project_template_assignments" ADD COLUMN "assigned_to_user_id" TEXT;

-- AddForeignKey
ALTER TABLE "project_template_assignments" ADD CONSTRAINT "project_template_assignments_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "project_template_assignments_assigned_to_user_id_idx" ON "project_template_assignments"("assigned_to_user_id");
