-- AlterTable
ALTER TABLE "team_members" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'Member';

-- AlterTable
ALTER TABLE "teams" ADD COLUMN     "is_stealth" BOOLEAN NOT NULL DEFAULT false;
