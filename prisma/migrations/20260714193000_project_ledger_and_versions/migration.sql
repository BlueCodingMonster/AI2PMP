-- Reshape projects into a customer contract ledger and add project delivery versions.
ALTER TABLE "projects" ALTER COLUMN "status" DROP DEFAULT;

ALTER TYPE "ProjectStatus" RENAME TO "ProjectStatus_old";
CREATE TYPE "ProjectStatus" AS ENUM ('CONTRACT_SIGNED', 'IMPLEMENTING', 'ACCEPTANCE', 'ARCHIVED');

ALTER TABLE "projects"
  ALTER COLUMN "status" TYPE "ProjectStatus"
  USING (
    CASE "status"::text
      WHEN 'PLANNING' THEN 'CONTRACT_SIGNED'
      WHEN 'ACTIVE' THEN 'IMPLEMENTING'
      WHEN 'ON_HOLD' THEN 'ACCEPTANCE'
      WHEN 'COMPLETED' THEN 'ARCHIVED'
      ELSE 'ARCHIVED'
    END
  )::"ProjectStatus";

DROP TYPE "ProjectStatus_old";

ALTER TABLE "projects"
  ADD COLUMN "customerName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "customerContact" TEXT,
  ADD COLUMN "customerPhone" TEXT,
  ADD COLUMN "projectManagerId" TEXT,
  ADD COLUMN "marketManager" TEXT,
  ADD COLUMN "salesManager" TEXT,
  ADD COLUMN "contractNumber" TEXT,
  ADD COLUMN "contractAmount" DECIMAL(18,2),
  ADD COLUMN "contractSignedAt" TIMESTAMP(3),
  ADD COLUMN "warrantyMonths" INTEGER,
  ADD COLUMN "warrantyExpiresAt" TIMESTAMP(3),
  ADD COLUMN "acceptanceDate" TIMESTAMP(3),
  ALTER COLUMN "status" SET DEFAULT 'CONTRACT_SIGNED';

ALTER TABLE "projects" DROP COLUMN "startDate";
ALTER TABLE "projects" DROP COLUMN "endDate";

ALTER TABLE "projects"
  ADD CONSTRAINT "projects_projectManagerId_fkey"
  FOREIGN KEY ("projectManagerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "projects_projectManagerId_idx" ON "projects"("projectManagerId");

CREATE TABLE "project_versions" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "project_versions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "project_versions"
  ADD CONSTRAINT "project_versions_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "project_versions_projectId_version_key" ON "project_versions"("projectId", "version");
CREATE INDEX "project_versions_projectId_idx" ON "project_versions"("projectId");
