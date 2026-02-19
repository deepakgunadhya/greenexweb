/*
  Warnings:

  - You are about to drop the column `conversationId` on the `conversation_reads` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `conversation_reads` table. All the data in the column will be lost.
  - You are about to drop the column `lastReadAt` on the `conversation_reads` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `conversation_reads` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `conversation_reads` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `conversations` table. All the data in the column will be lost.
  - You are about to drop the column `groupId` on the `conversations` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `conversations` table. All the data in the column will be lost.
  - You are about to drop the column `userOneId` on the `conversations` table. All the data in the column will be lost.
  - You are about to drop the column `userTwoId` on the `conversations` table. All the data in the column will be lost.
  - You are about to drop the column `checklist_link` on the `project_tasks` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[conversation_id,user_id]` on the table `conversation_reads` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `conversation_id` to the `conversation_reads` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `conversation_reads` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `conversation_reads` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `conversations` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "conversation_reads" DROP CONSTRAINT "conversation_reads_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "conversation_reads" DROP CONSTRAINT "conversation_reads_userId_fkey";

-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_groupId_fkey";

-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_userOneId_fkey";

-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_userTwoId_fkey";

-- DropIndex
DROP INDEX "conversation_reads_conversationId_idx";

-- DropIndex
DROP INDEX "conversation_reads_conversationId_userId_key";

-- DropIndex
DROP INDEX "conversation_reads_userId_idx";

-- AlterTable
ALTER TABLE "conversation_reads" DROP COLUMN "conversationId",
DROP COLUMN "createdAt",
DROP COLUMN "lastReadAt",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "conversation_id" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "last_read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "conversations" DROP COLUMN "createdAt",
DROP COLUMN "groupId",
DROP COLUMN "updatedAt",
DROP COLUMN "userOneId",
DROP COLUMN "userTwoId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "group_id" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_one_id" TEXT,
ADD COLUMN     "user_two_id" TEXT;

-- AlterTable
ALTER TABLE "project_tasks" DROP COLUMN "checklist_link";

-- CreateIndex
CREATE INDEX "conversation_reads_conversation_id_idx" ON "conversation_reads"("conversation_id");

-- CreateIndex
CREATE INDEX "conversation_reads_user_id_idx" ON "conversation_reads"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_reads_conversation_id_user_id_key" ON "conversation_reads"("conversation_id", "user_id");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_one_id_fkey" FOREIGN KEY ("user_one_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_two_id_fkey" FOREIGN KEY ("user_two_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_reads" ADD CONSTRAINT "conversation_reads_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_reads" ADD CONSTRAINT "conversation_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
