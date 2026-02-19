-- Step 1: Migrate existing file data from checklist_template_files to checklist_template_file_attachments
INSERT INTO checklist_template_file_attachments (
  id,
  template_file_id,
  file_path,
  original_name,
  file_size,
  mime_type,
  sort_order,
  uploaded_by,
  uploaded_at
)
SELECT
  gen_random_uuid(),
  id,
  file_path,
  original_name,
  file_size,
  mime_type,
  0,
  uploaded_by,
  uploaded_at
FROM checklist_template_files
WHERE file_path IS NOT NULL;

-- Step 2: Add new columns
ALTER TABLE "checklist_template_files" ADD COLUMN "created_by" TEXT;
ALTER TABLE "checklist_template_files" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Step 3: Copy data to new columns
UPDATE "checklist_template_files" SET "created_by" = "uploaded_by";
UPDATE "checklist_template_files" SET "created_at" = "uploaded_at";

-- Step 4: Drop old columns
ALTER TABLE "checklist_template_files" DROP COLUMN "file_path";
ALTER TABLE "checklist_template_files" DROP COLUMN "original_name";
ALTER TABLE "checklist_template_files" DROP COLUMN "file_size";
ALTER TABLE "checklist_template_files" DROP COLUMN "mime_type";
ALTER TABLE "checklist_template_files" DROP COLUMN "uploaded_by";
ALTER TABLE "checklist_template_files" DROP COLUMN "uploaded_at";
