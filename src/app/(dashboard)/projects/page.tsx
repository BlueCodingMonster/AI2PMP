import { getProjects } from "@/actions/projects";
import { getMembers } from "@/actions/team";
import ProjectLedgerManager from "@/components/projects/project-ledger-manager";

export default async function ProjectsPage() {
  const [projectsResult, peopleResult] = await Promise.all([getProjects(), getMembers()]);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const projects = (projectsResult.success ? projectsResult.data : []).map((project) => ({
    id: project.id,
    name: project.name,
    key: project.key,
    customerName: project.customerName,
    customerContact: project.customerContact,
    customerPhone: project.customerPhone,
    projectManagerId: project.projectManagerId,
    projectManager: project.projectManager,
    marketManager: project.marketManager,
    salesManager: project.salesManager,
    contractNumber: project.contractNumber,
    contractAmount: project.contractAmount?.toString() ?? null,
    contractSignedAt: project.contractSignedAt?.toISOString() ?? null,
    warrantyMonths: project.warrantyMonths,
    warrantyExpiresAt: project.warrantyExpiresAt?.toISOString() ?? null,
    warrantyExpired: Boolean(project.warrantyExpiresAt && project.warrantyExpiresAt < todayStart),
    status: project.status,
    acceptanceDate: project.acceptanceDate?.toISOString() ?? null,
    description: project.description,
    versions: project.versions,
  }));
  const people = (peopleResult.success ? peopleResult.data : [])
    .filter((person) => person.isActive)
    .map((person) => ({ id: person.id, name: person.name, username: person.username, department: person.department, position: person.position }));

  return <ProjectLedgerManager projects={projects} people={people} />;
}
