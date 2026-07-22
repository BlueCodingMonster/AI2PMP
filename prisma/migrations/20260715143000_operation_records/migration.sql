CREATE TYPE "OperationVersionType" AS ENUM ('PRODUCT', 'PROJECT');
CREATE TYPE "OperationType" AS ENUM ('DATA_REPAIR', 'ENVIRONMENT_CONFIGURATION', 'CONSULTATION', 'CODE_BUG', 'OTHER');
CREATE TYPE "OperationStatus" AS ENUM ('PENDING', 'PROCESSING', 'PENDING_CONFIRMATION', 'COMPLETED');
CREATE TYPE "CustomerConfirmationStatus" AS ENUM ('PENDING', 'CONFIRMED');

CREATE TABLE "operation_records" (
    "id" TEXT NOT NULL,
    "sequenceNo" SERIAL NOT NULL,
    "ownershipVersionType" "OperationVersionType" NOT NULL,
    "ownershipProductVersionId" TEXT,
    "ownershipProjectVersionId" TEXT,
    "type" "OperationType" NOT NULL,
    "eventDescription" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "reporter" TEXT NOT NULL,
    "status" "OperationStatus" NOT NULL DEFAULT 'PENDING',
    "operationContent" TEXT NOT NULL,
    "processingStartedAt" TIMESTAMP(3),
    "processingCompletedAt" TIMESTAMP(3),
    "customerConfirmationStatus" "CustomerConfirmationStatus" NOT NULL DEFAULT 'PENDING',
    "fixVersionType" "OperationVersionType",
    "fixProductVersionId" TEXT,
    "fixProjectVersionId" TEXT,
    "followUpActions" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "operation_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "_OperationRecordHandlers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_OperationRecordHandlers_AB_pkey" PRIMARY KEY ("A", "B")
);

CREATE UNIQUE INDEX "operation_records_sequenceNo_key" ON "operation_records"("sequenceNo");
CREATE INDEX "operation_records_ownershipVersionType_idx" ON "operation_records"("ownershipVersionType");
CREATE INDEX "operation_records_ownershipProductVersionId_idx" ON "operation_records"("ownershipProductVersionId");
CREATE INDEX "operation_records_ownershipProjectVersionId_idx" ON "operation_records"("ownershipProjectVersionId");
CREATE INDEX "operation_records_type_idx" ON "operation_records"("type");
CREATE INDEX "operation_records_status_idx" ON "operation_records"("status");
CREATE INDEX "operation_records_occurredAt_idx" ON "operation_records"("occurredAt");
CREATE INDEX "_OperationRecordHandlers_B_index" ON "_OperationRecordHandlers"("B");

ALTER TABLE "operation_records" ADD CONSTRAINT "operation_records_ownershipProductVersionId_fkey" FOREIGN KEY ("ownershipProductVersionId") REFERENCES "product_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "operation_records" ADD CONSTRAINT "operation_records_ownershipProjectVersionId_fkey" FOREIGN KEY ("ownershipProjectVersionId") REFERENCES "project_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "operation_records" ADD CONSTRAINT "operation_records_fixProductVersionId_fkey" FOREIGN KEY ("fixProductVersionId") REFERENCES "product_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "operation_records" ADD CONSTRAINT "operation_records_fixProjectVersionId_fkey" FOREIGN KEY ("fixProjectVersionId") REFERENCES "project_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "operation_records" ADD CONSTRAINT "operation_records_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "_OperationRecordHandlers" ADD CONSTRAINT "_OperationRecordHandlers_A_fkey" FOREIGN KEY ("A") REFERENCES "operation_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_OperationRecordHandlers" ADD CONSTRAINT "_OperationRecordHandlers_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
