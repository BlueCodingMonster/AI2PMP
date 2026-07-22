-- Permanently remove requirement discussions while preserving task and bug comments.
DELETE FROM "comments" WHERE "requirementId" IS NOT NULL;

ALTER TABLE "comments" DROP CONSTRAINT "comments_requirementId_fkey";
DROP INDEX "comments_requirementId_idx";
ALTER TABLE "comments" DROP COLUMN "requirementId";
