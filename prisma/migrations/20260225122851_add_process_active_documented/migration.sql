-- AlterTable
ALTER TABLE "Process" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "documented" BOOLEAN NOT NULL DEFAULT false;
