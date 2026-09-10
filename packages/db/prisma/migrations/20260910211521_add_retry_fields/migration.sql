/*
  Warnings:

  - You are about to drop the column `maxAttempt` on the `Job` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Job" DROP COLUMN "maxAttempt",
ADD COLUMN     "maxAttempts" INTEGER NOT NULL DEFAULT 3;
