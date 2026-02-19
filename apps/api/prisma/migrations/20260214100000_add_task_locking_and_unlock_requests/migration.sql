-- AlterTable: Add locking fields to project_tasks
ALTER TABLE "project_tasks" ADD COLUMN "is_locked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "project_tasks" ADD COLUMN "locked_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "project_tasks_is_locked_idx" ON "project_tasks"("is_locked");

-- CreateTable: task_unlock_requests
CREATE TABLE "task_unlock_requests" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_unlock_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_unlock_requests_task_id_idx" ON "task_unlock_requests"("task_id");
CREATE INDEX "task_unlock_requests_status_idx" ON "task_unlock_requests"("status");
CREATE INDEX "task_unlock_requests_requested_by_id_idx" ON "task_unlock_requests"("requested_by_id");

-- AddForeignKey
ALTER TABLE "task_unlock_requests" ADD CONSTRAINT "task_unlock_requests_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "project_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_unlock_requests" ADD CONSTRAINT "task_unlock_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "task_unlock_requests" ADD CONSTRAINT "task_unlock_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
