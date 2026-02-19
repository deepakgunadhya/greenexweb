-- CreateTable
CREATE TABLE "checklist_template_files" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "client_visible" BOOLEAN NOT NULL DEFAULT true,
    "file_path" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "file_size" BIGINT,
    "mime_type" TEXT,
    "uploaded_by" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_template_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "checklist_template_files_category_idx" ON "checklist_template_files"("category");
