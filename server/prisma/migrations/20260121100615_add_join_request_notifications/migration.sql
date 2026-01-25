-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'joinRequest';

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "issue_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
