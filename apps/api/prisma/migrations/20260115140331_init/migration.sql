/*
  Warnings:

  - You are about to drop the `checklist_item_files` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `checklist_template_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `checklist_templates` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `project_checklist_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `project_checklists` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `service_checklist_templates` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "checklist_item_files" DROP CONSTRAINT "checklist_item_files_project_checklist_item_id_fkey";

-- DropForeignKey
ALTER TABLE "checklist_item_files" DROP CONSTRAINT "checklist_item_files_reviewed_by_fkey";

-- DropForeignKey
ALTER TABLE "checklist_item_files" DROP CONSTRAINT "checklist_item_files_submitted_by_fkey";

-- DropForeignKey
ALTER TABLE "checklist_item_files" DROP CONSTRAINT "checklist_item_files_uploaded_by_fkey";

-- DropForeignKey
ALTER TABLE "checklist_item_files" DROP CONSTRAINT "checklist_item_files_verified_by_fkey";

-- DropForeignKey
ALTER TABLE "checklist_template_items" DROP CONSTRAINT "checklist_template_items_template_id_fkey";

-- DropForeignKey
ALTER TABLE "project_checklist_items" DROP CONSTRAINT "project_checklist_items_filled_by_fkey";

-- DropForeignKey
ALTER TABLE "project_checklist_items" DROP CONSTRAINT "project_checklist_items_project_checklist_id_fkey";

-- DropForeignKey
ALTER TABLE "project_checklist_items" DROP CONSTRAINT "project_checklist_items_template_item_id_fkey";

-- DropForeignKey
ALTER TABLE "project_checklists" DROP CONSTRAINT "project_checklists_project_id_fkey";

-- DropForeignKey
ALTER TABLE "project_checklists" DROP CONSTRAINT "project_checklists_template_id_fkey";

-- DropForeignKey
ALTER TABLE "project_checklists" DROP CONSTRAINT "project_checklists_verified_by_fkey";

-- DropForeignKey
ALTER TABLE "project_tasks" DROP CONSTRAINT "project_tasks_checklist_link_fkey";

-- DropForeignKey
ALTER TABLE "service_checklist_templates" DROP CONSTRAINT "service_checklist_templates_service_id_fkey";

-- DropForeignKey
ALTER TABLE "service_checklist_templates" DROP CONSTRAINT "service_checklist_templates_template_id_fkey";

-- DropTable
DROP TABLE "checklist_item_files";

-- DropTable
DROP TABLE "checklist_template_items";

-- DropTable
DROP TABLE "checklist_templates";

-- DropTable
DROP TABLE "project_checklist_items";

-- DropTable
DROP TABLE "project_checklists";

-- DropTable
DROP TABLE "service_checklist_templates";
