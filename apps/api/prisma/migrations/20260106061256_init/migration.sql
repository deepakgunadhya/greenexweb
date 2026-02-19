-- DropForeignKey
ALTER TABLE "conversation_reads" DROP CONSTRAINT "conversation_reads_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "conversation_reads" DROP CONSTRAINT "conversation_reads_userId_fkey";

-- AddForeignKey
ALTER TABLE "conversation_reads" ADD CONSTRAINT "conversation_reads_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_reads" ADD CONSTRAINT "conversation_reads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
