/*
  Warnings:

  - Added the required column `quotation_id` to the `projects` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "project_tasks" ADD COLUMN     "blocked_reason" TEXT,
ADD COLUMN     "checklist_link" TEXT,
ADD COLUMN     "service_id" TEXT,
ADD COLUMN     "sla_status" TEXT NOT NULL DEFAULT 'on_track',
ALTER COLUMN "status" SET DEFAULT 'to_do',
ALTER COLUMN "priority" SET DEFAULT 'medium';

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "client_review_status" TEXT NOT NULL DEFAULT 'not_started',
ADD COLUMN     "execution_status" TEXT NOT NULL DEFAULT 'not_started',
ADD COLUMN     "payment_status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "quotation_id" TEXT NOT NULL,
ADD COLUMN     "status_changed_at" TIMESTAMP(3),
ADD COLUMN     "status_changed_by" TEXT,
ADD COLUMN     "verification_status" TEXT NOT NULL DEFAULT 'pending',
ALTER COLUMN "status" SET DEFAULT 'planned';

-- CreateTable
CREATE TABLE "checklist_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expected_tat_days" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_template_items" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "help_text" TEXT,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT false,
    "visible_to_client" BOOLEAN NOT NULL DEFAULT true,
    "expected_document_type" TEXT,
    "section_group" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "dropdown_options" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_template_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_checklist_templates" (
    "service_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_checklist_templates_pkey" PRIMARY KEY ("service_id","template_id")
);

-- CreateTable
CREATE TABLE "project_checklists" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "completeness_percent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "verification_comments" TEXT,

    CONSTRAINT "project_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_checklist_items" (
    "id" TEXT NOT NULL,
    "project_checklist_id" TEXT NOT NULL,
    "template_item_id" TEXT NOT NULL,
    "value_text" TEXT,
    "value_number" DECIMAL(65,30),
    "value_date" TIMESTAMP(3),
    "value_boolean" BOOLEAN,
    "verified_status" TEXT NOT NULL DEFAULT 'pending',
    "verifier_comment" TEXT,
    "filled_by" TEXT,
    "filled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_item_files" (
    "id" TEXT NOT NULL,
    "project_checklist_item_id" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "file_size" BIGINT,
    "mime_type" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "uploaded_by" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_item_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "checklist_templates_category_idx" ON "checklist_templates"("category");

-- CreateIndex
CREATE INDEX "checklist_templates_is_active_idx" ON "checklist_templates"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_template_items_itemCode_key" ON "checklist_template_items"("itemCode");

-- CreateIndex
CREATE INDEX "checklist_template_items_template_id_idx" ON "checklist_template_items"("template_id");

-- CreateIndex
CREATE INDEX "checklist_template_items_itemCode_idx" ON "checklist_template_items"("itemCode");

-- CreateIndex
CREATE INDEX "checklist_template_items_type_idx" ON "checklist_template_items"("type");

-- CreateIndex
CREATE INDEX "checklist_template_items_sort_order_idx" ON "checklist_template_items"("sort_order");

-- CreateIndex
CREATE INDEX "project_checklists_project_id_idx" ON "project_checklists"("project_id");

-- CreateIndex
CREATE INDEX "project_checklists_template_id_idx" ON "project_checklists"("template_id");

-- CreateIndex
CREATE INDEX "project_checklists_status_idx" ON "project_checklists"("status");

-- CreateIndex
CREATE INDEX "project_checklists_version_idx" ON "project_checklists"("version");

-- CreateIndex
CREATE INDEX "project_checklist_items_project_checklist_id_idx" ON "project_checklist_items"("project_checklist_id");

-- CreateIndex
CREATE INDEX "project_checklist_items_template_item_id_idx" ON "project_checklist_items"("template_item_id");

-- CreateIndex
CREATE INDEX "project_checklist_items_verified_status_idx" ON "project_checklist_items"("verified_status");

-- CreateIndex
CREATE INDEX "checklist_item_files_project_checklist_item_id_idx" ON "checklist_item_files"("project_checklist_item_id");

-- CreateIndex
CREATE INDEX "checklist_item_files_version_idx" ON "checklist_item_files"("version");

-- CreateIndex
CREATE INDEX "project_tasks_sla_status_idx" ON "project_tasks"("sla_status");

-- CreateIndex
CREATE INDEX "project_tasks_due_date_idx" ON "project_tasks"("due_date");

-- CreateIndex
CREATE INDEX "projects_verification_status_idx" ON "projects"("verification_status");

-- CreateIndex
CREATE INDEX "projects_execution_status_idx" ON "projects"("execution_status");

-- CreateIndex
CREATE INDEX "projects_client_review_status_idx" ON "projects"("client_review_status");

-- CreateIndex
CREATE INDEX "projects_payment_status_idx" ON "projects"("payment_status");

-- CreateIndex
CREATE INDEX "projects_quotation_id_idx" ON "projects"("quotation_id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_status_changed_by_fkey" FOREIGN KEY ("status_changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_checklist_link_fkey" FOREIGN KEY ("checklist_link") REFERENCES "project_checklists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_template_items" ADD CONSTRAINT "checklist_template_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "checklist_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_checklist_templates" ADD CONSTRAINT "service_checklist_templates_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_checklist_templates" ADD CONSTRAINT "service_checklist_templates_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "checklist_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_checklists" ADD CONSTRAINT "project_checklists_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_checklists" ADD CONSTRAINT "project_checklists_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "checklist_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_checklists" ADD CONSTRAINT "project_checklists_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_checklist_items" ADD CONSTRAINT "project_checklist_items_project_checklist_id_fkey" FOREIGN KEY ("project_checklist_id") REFERENCES "project_checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_checklist_items" ADD CONSTRAINT "project_checklist_items_template_item_id_fkey" FOREIGN KEY ("template_item_id") REFERENCES "checklist_template_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_checklist_items" ADD CONSTRAINT "project_checklist_items_filled_by_fkey" FOREIGN KEY ("filled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_item_files" ADD CONSTRAINT "checklist_item_files_project_checklist_item_id_fkey" FOREIGN KEY ("project_checklist_item_id") REFERENCES "project_checklist_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_item_files" ADD CONSTRAINT "checklist_item_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
