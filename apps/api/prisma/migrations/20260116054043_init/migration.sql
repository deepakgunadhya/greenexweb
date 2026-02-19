/*
  Warnings:

  - You are about to drop the column `conversation_id` on the `conversation_reads` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `conversation_reads` table. All the data in the column will be lost.
  - You are about to drop the column `last_read_at` on the `conversation_reads` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `conversation_reads` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `conversation_reads` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `conversations` table. All the data in the column will be lost.
  - You are about to drop the column `group_id` on the `conversations` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `conversations` table. All the data in the column will be lost.
  - You are about to drop the column `user_one_id` on the `conversations` table. All the data in the column will be lost.
  - You are about to drop the column `user_two_id` on the `conversations` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[conversationId,userId]` on the table `conversation_reads` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `conversationId` to the `conversation_reads` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `conversation_reads` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `conversation_reads` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `conversations` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "conversation_reads" DROP CONSTRAINT "conversation_reads_conversation_id_fkey";

-- DropForeignKey
ALTER TABLE "conversation_reads" DROP CONSTRAINT "conversation_reads_user_id_fkey";

-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_group_id_fkey";

-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_user_one_id_fkey";

-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_user_two_id_fkey";

-- DropIndex
DROP INDEX "conversation_reads_conversation_id_idx";

-- DropIndex
DROP INDEX "conversation_reads_conversation_id_user_id_key";

-- DropIndex
DROP INDEX "conversation_reads_user_id_idx";

-- AlterTable
ALTER TABLE "conversation_reads" DROP COLUMN "conversation_id",
DROP COLUMN "created_at",
DROP COLUMN "last_read_at",
DROP COLUMN "updated_at",
DROP COLUMN "user_id",
ADD COLUMN     "conversationId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "conversations" DROP COLUMN "created_at",
DROP COLUMN "group_id",
DROP COLUMN "updated_at",
DROP COLUMN "user_one_id",
DROP COLUMN "user_two_id",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userOneId" TEXT,
ADD COLUMN     "userTwoId" TEXT;

-- AlterTable
ALTER TABLE "project_tasks" ADD COLUMN     "checklist_link" TEXT;

-- CreateIndex
CREATE INDEX "conversation_reads_conversationId_idx" ON "conversation_reads"("conversationId");

-- CreateIndex
CREATE INDEX "conversation_reads_userId_idx" ON "conversation_reads"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_reads_conversationId_userId_key" ON "conversation_reads"("conversationId", "userId");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_userOneId_fkey" FOREIGN KEY ("userOneId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_userTwoId_fkey" FOREIGN KEY ("userTwoId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_reads" ADD CONSTRAINT "conversation_reads_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_reads" ADD CONSTRAINT "conversation_reads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
