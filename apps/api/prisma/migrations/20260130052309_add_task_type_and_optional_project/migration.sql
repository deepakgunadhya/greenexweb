-- AlterTable
ALTER TABLE "project_tasks" ADD COLUMN     "task_type" TEXT NOT NULL DEFAULT 'project',
ALTER COLUMN "project_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "project_tasks_task_type_idx" ON "project_tasks"("task_type");
