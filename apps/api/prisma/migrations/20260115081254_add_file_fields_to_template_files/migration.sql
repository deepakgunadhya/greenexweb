/*
  Warnings:

  - Added the required column `updated_at` to the `checklist_template_files` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "checklist_template_files" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "checklist_template_file_attachments" (
    "id" TEXT NOT NULL,
    "template_file_id" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "file_size" BIGINT,
    "mime_type" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "uploaded_by" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_template_file_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_template_assignments" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "template_file_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "assigned_by" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "current_remarks" TEXT,

    CONSTRAINT "project_template_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_submissions" (
    "id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "file_path" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "file_size" BIGINT,
    "mime_type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "uploaded_by" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_remarks" TEXT,
    "is_latest" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "client_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "checklist_template_file_attachments_template_file_id_idx" ON "checklist_template_file_attachments"("template_file_id");

-- CreateIndex
CREATE INDEX "project_template_assignments_project_id_idx" ON "project_template_assignments"("project_id");

-- CreateIndex
CREATE INDEX "project_template_assignments_template_file_id_idx" ON "project_template_assignments"("template_file_id");

-- CreateIndex
CREATE INDEX "project_template_assignments_status_idx" ON "project_template_assignments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "project_template_assignments_project_id_template_file_id_key" ON "project_template_assignments"("project_id", "template_file_id");

-- CreateIndex
CREATE INDEX "client_submissions_assignment_id_idx" ON "client_submissions"("assignment_id");

-- CreateIndex
CREATE INDEX "client_submissions_version_idx" ON "client_submissions"("version");

-- CreateIndex
CREATE INDEX "client_submissions_status_idx" ON "client_submissions"("status");

-- CreateIndex
CREATE INDEX "client_submissions_is_latest_idx" ON "client_submissions"("is_latest");

-- AddForeignKey
ALTER TABLE "checklist_template_file_attachments" ADD CONSTRAINT "checklist_template_file_attachments_template_file_id_fkey" FOREIGN KEY ("template_file_id") REFERENCES "checklist_template_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_template_assignments" ADD CONSTRAINT "project_template_assignments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_template_assignments" ADD CONSTRAINT "project_template_assignments_template_file_id_fkey" FOREIGN KEY ("template_file_id") REFERENCES "checklist_template_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_submissions" ADD CONSTRAINT "client_submissions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "project_template_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_submissions" ADD CONSTRAINT "client_submissions_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_submissions" ADD CONSTRAINT "client_submissions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
