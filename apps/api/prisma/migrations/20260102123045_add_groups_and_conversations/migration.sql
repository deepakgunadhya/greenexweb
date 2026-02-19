-- CreateEnum (only if they don't exist from previous migration)
DO $$ BEGIN
 CREATE TYPE "GroupMemberRole" AS ENUM ('MEMBER', 'ADMIN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "ConversationType" AS ENUM ('DIRECT', 'GROUP');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "AttachmentType" AS ENUM ('image', 'file');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateTable groups (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "groups" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "avatar" TEXT,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "deleted_by" TEXT,

  CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable group_members (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "group_members" (
  "id" TEXT NOT NULL,
  "group_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" "GroupMemberRole" NOT NULL DEFAULT 'MEMBER',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable conversations (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "conversations" (
  "id" TEXT NOT NULL,
  "type" "ConversationType" NOT NULL,
  "userOneId" TEXT,
  "userTwoId" TEXT,
  "groupId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable conversation_reads (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "conversation_reads" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "conversation_reads_pkey" PRIMARY KEY ("id")
);

-- CreateTable messages (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "messages" (
  "id" TEXT NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "sender_id" TEXT NOT NULL,
  "content" TEXT,
  "attachment_url" TEXT,
  "attachment_type" "AttachmentType",
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (check if exists before creating)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'group_members_group_id_user_id_key') THEN
    CREATE UNIQUE INDEX "group_members_group_id_user_id_key" ON "group_members"("group_id", "user_id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'conversation_reads_conversationId_userId_key') THEN
    CREATE UNIQUE INDEX "conversation_reads_conversationId_userId_key" ON "conversation_reads"("conversationId", "userId");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'conversation_reads_conversationId_idx') THEN
    CREATE INDEX "conversation_reads_conversationId_idx" ON "conversation_reads"("conversationId");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'conversation_reads_userId_idx') THEN
    CREATE INDEX "conversation_reads_userId_idx" ON "conversation_reads"("userId");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'messages_conversation_id_idx') THEN
    CREATE INDEX "messages_conversation_id_idx" ON "messages"("conversation_id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'messages_sender_id_idx') THEN
    CREATE INDEX "messages_sender_id_idx" ON "messages"("sender_id");
  END IF;
END $$;

-- AddForeignKey (check if exists before adding)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'groups_created_by_fkey') THEN
    ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_fkey" 
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'groups_deleted_by_fkey') THEN
    ALTER TABLE "groups" ADD CONSTRAINT "groups_deleted_by_fkey" 
    FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'group_members_group_id_fkey') THEN
    ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" 
    FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'group_members_user_id_fkey') THEN
    ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_userOneId_fkey') THEN
    ALTER TABLE "conversations" ADD CONSTRAINT "conversations_userOneId_fkey" 
    FOREIGN KEY ("userOneId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_userTwoId_fkey') THEN
    ALTER TABLE "conversations" ADD CONSTRAINT "conversations_userTwoId_fkey" 
    FOREIGN KEY ("userTwoId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_groupId_fkey') THEN
    ALTER TABLE "conversations" ADD CONSTRAINT "conversations_groupId_fkey" 
    FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversation_reads_conversationId_fkey') THEN
    ALTER TABLE "conversation_reads" ADD CONSTRAINT "conversation_reads_conversationId_fkey" 
    FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversation_reads_userId_fkey') THEN
    ALTER TABLE "conversation_reads" ADD CONSTRAINT "conversation_reads_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_conversation_id_fkey') THEN
    ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" 
    FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_sender_id_fkey') THEN
    ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" 
    FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;