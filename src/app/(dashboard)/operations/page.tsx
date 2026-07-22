import { getOperationRecords, getOperationVersionOptions } from "@/actions/operations";
import { getMembers } from "@/actions/team";
import OperationLedgerManager from "@/components/operations/operation-ledger-manager";

export default async function OperationsPage() {
  const [recordResult, versions, memberResult] = await Promise.all([getOperationRecords(), getOperationVersionOptions(), getMembers()]);
  const records = (recordResult.success ? recordResult.data : []).map((item) => ({
    id: item.id, sequenceNo: item.sequenceNo, ownershipVersionType: item.ownershipVersionType,
    ownershipVersionId: item.ownershipProductVersionId || item.ownershipProjectVersionId || "",
    type: item.type, eventDescription: item.eventDescription, occurredAt: item.occurredAt.toISOString(), reporter: item.reporter,
    handlerIds: item.handlers.map((person) => person.id), handlers: item.handlers, status: item.status, operationContent: item.operationContent,
    processingStartedAt: item.processingStartedAt?.toISOString() || null, processingCompletedAt: item.processingCompletedAt?.toISOString() || null,
    customerConfirmationStatus: item.customerConfirmationStatus, fixVersionType: item.fixVersionType,
    fixVersionId: item.fixProductVersionId || item.fixProjectVersionId || null, followUpActions: item.followUpActions, notes: item.notes,
    createdAt: item.createdAt.toISOString(),
  }));
  const people = (memberResult.success ? memberResult.data : []).filter((person) => person.isActive).map((person) => ({ id: person.id, name: person.name }));
  return <OperationLedgerManager records={records} versions={versions} people={people} />;
}
