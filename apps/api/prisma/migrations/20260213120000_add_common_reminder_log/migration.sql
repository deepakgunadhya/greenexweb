-- DropTable (old lead-specific reminder log if it exists)
DROP TABLE IF EXISTS "lead_closing_reminder_logs";

-- CreateTable
CREATE TABLE "common_reminder_logs" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_date" TEXT NOT NULL,
    "recipients" TEXT[],

    CONSTRAINT "common_reminder_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "common_reminder_logs_sent_date_idx" ON "common_reminder_logs"("sent_date");

-- CreateIndex
CREATE UNIQUE INDEX "common_reminder_logs_entity_id_entity_type_type_sent_date_key" ON "common_reminder_logs"("entity_id", "entity_type", "type", "sent_date");
