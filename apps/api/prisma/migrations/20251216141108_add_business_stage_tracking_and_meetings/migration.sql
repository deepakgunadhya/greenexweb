-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "business_stage" TEXT NOT NULL DEFAULT 'INITIAL',
ADD COLUMN     "company_name" TEXT,
ADD COLUMN     "contact_email" TEXT,
ADD COLUMN     "contact_name" TEXT,
ADD COLUMN     "contact_phone" TEXT,
ADD COLUMN     "contact_position" TEXT,
ADD COLUMN     "meeting_status" TEXT,
ADD COLUMN     "requires_meeting" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "stage_changed_at" TIMESTAMP(3),
ADD COLUMN     "stage_changed_by" TEXT;

-- CreateTable
CREATE TABLE "meetings" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "duration" INTEGER,
    "location" TEXT,
    "meeting_link" TEXT,
    "meeting_type" TEXT NOT NULL DEFAULT 'KICKOFF',
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "outcome" TEXT,
    "action_items" TEXT,
    "organized_by" TEXT NOT NULL,
    "attendees" TEXT,
    "client_side" TEXT,
    "greenex_side" TEXT,
    "follow_up_required" BOOLEAN NOT NULL DEFAULT false,
    "follow_up_date" TIMESTAMP(3),
    "follow_up_notes" TEXT,
    "calendar_event_id" TEXT,
    "reminder_sent" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "quotation_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "total_amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "valid_until" TIMESTAMP(3) NOT NULL,
    "document_path" TEXT,
    "original_file_name" TEXT,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sent_at" TIMESTAMP(3),
    "viewed_at" TIMESTAMP(3),
    "responded_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "client_notes" TEXT,
    "internal_notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_latest" BOOLEAN NOT NULL DEFAULT true,
    "previous_version" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meetings_lead_id_idx" ON "meetings"("lead_id");

-- CreateIndex
CREATE INDEX "meetings_status_idx" ON "meetings"("status");

-- CreateIndex
CREATE INDEX "meetings_scheduled_at_idx" ON "meetings"("scheduled_at");

-- CreateIndex
CREATE INDEX "meetings_meeting_type_idx" ON "meetings"("meeting_type");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_quotation_number_key" ON "quotations"("quotation_number");

-- CreateIndex
CREATE INDEX "quotations_lead_id_idx" ON "quotations"("lead_id");

-- CreateIndex
CREATE INDEX "quotations_status_idx" ON "quotations"("status");

-- CreateIndex
CREATE INDEX "quotations_quotation_number_idx" ON "quotations"("quotation_number");

-- CreateIndex
CREATE INDEX "quotations_valid_until_idx" ON "quotations"("valid_until");

-- CreateIndex
CREATE INDEX "leads_business_stage_idx" ON "leads"("business_stage");

-- CreateIndex
CREATE INDEX "leads_meeting_status_idx" ON "leads"("meeting_status");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_stage_changed_by_fkey" FOREIGN KEY ("stage_changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_organized_by_fkey" FOREIGN KEY ("organized_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
