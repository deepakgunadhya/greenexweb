-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "po_attachment_mime_type" TEXT,
ADD COLUMN     "po_attachment_original_name" TEXT,
ADD COLUMN     "po_attachment_path" TEXT,
ADD COLUMN     "po_attachment_size" BIGINT,
ADD COLUMN     "po_number" TEXT;
