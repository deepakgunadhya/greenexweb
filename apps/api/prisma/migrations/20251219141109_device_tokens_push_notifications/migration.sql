-- CreateEnum for Platform
CREATE TYPE "Platform" AS ENUM ('ANDROID', 'IOS', 'WEB');

-- CreateEnum for NotificationType
CREATE TYPE "NotificationType" AS ENUM ('user', 'broadcast', 'topic', 'scheduled');

-- CreateTable: device_tokens
CREATE TABLE "device_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "type" "NotificationType" NOT NULL,
    "token" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "device_id" TEXT NOT NULL,
    "device_info" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");

-- CreateIndex
CREATE INDEX "device_tokens_user_id_idx" ON "device_tokens"("user_id");

-- CreateIndex
CREATE INDEX "device_tokens_token_idx" ON "device_tokens"("token");

-- CreateIndex
CREATE INDEX "device_tokens_is_active_idx" ON "device_tokens"("is_active");

-- MIGRATION FILE INSTRUCTIONS:
-- 1. Create a new migration file in your Prisma migrations folder
-- 2. Name it: YYYYMMDDHHMMSS_add_device_tokens_table (use current timestamp)
-- 3. Copy this SQL into a file named "migration.sql" in that folder
-- 4. Run: npx prisma migrate deploy
-- OR just run: npx prisma migrate dev --name add_device_tokens_table

-- =================================================================
-- ALTERNATIVE: If you want to generate the migration automatically
-- =================================================================
-- 
-- Step 1: Add this to your schema.prisma file:
--
-- enum Platform {
--   ANDROID
--   IOS
--   WEB
-- }
--
-- enum NotificationType {
--   user
--   broadcast
--   topic
--   scheduled
-- }
--
-- model DeviceToken {
--   id         String             @id @default(uuid())
--   userId     String?            @map("user_id")
--   type       NotificationType
--   token      String             @unique
--   platform   Platform
--   deviceInfo Json?              @map("device_info")
--   isActive   Boolean            @default(true) @map("is_active")
--   createdAt  DateTime           @default(now()) @map("created_at")
--   updatedAt  DateTime           @updatedAt @map("updated_at")
--   lastUsedAt DateTime           @default(now()) @map("last_used_at")
--
--   @@index([userId])
--   @@index([token])
--   @@index([isActive])
--   @@map("device_tokens")
-- }
--
-- Step 2: Run this command:
-- npx prisma migrate dev --name add_device_tokens_table
--
-- This will automatically generate the migration file for you.