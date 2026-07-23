import assert from "node:assert";

// Mock tasks
const tasks = [
  { id: "t1", title: "Task 1", productLineTeam: { id: "teamA", name: "Team A" }, executorId: "u1", children: [] },
  { id: "t2", title: "Task 2", productLineTeam: { id: "teamB", name: "Team B" }, executorId: "u2", children: [] },
];

// Mock context
const context = {
  users: [
    { id: "u1", name: "Alice", level: "P3" },
    { id: "u2", name: "Bob", level: "P3" },
    { id: "u3", name: "Charlie", level: "P3" }, // Team C member, no tasks
    { id: "u4", name: "Manager", level: "部门经理" },
  ],
  teams: [
    { id: "teamA", name: "Team A", members: [{ userId: "u1", role: "LEADER" }] },
    { id: "teamB", name: "Team B", members: [{ userId: "u2", role: "DEVELOPER" }] },
    { id: "teamC", name: "Team C", members: [{ userId: "u3", role: "DEVELOPER" }] },
  ],
};

function filterTasks(allTasks, selectedTeamIds) {
  return allTasks.filter((task) => selectedTeamIds.length === 0 || selectedTeamIds.includes(task.productLineTeam.id));
}

function buildGroupedUsers(filteredTasks, context, selectedTeamIds) {
  const tasksByExecutor = new Map();
  filteredTasks.forEach((task) => {
    if (task.executorId) {
      const existing = tasksByExecutor.get(task.executorId) || [];
      existing.push(task);
      tasksByExecutor.set(task.executorId, existing);
    }
  });

  const selectedTeamUserIds = new Set();
  if (selectedTeamIds.length > 0) {
    context.teams.forEach((team) => {
      if (selectedTeamIds.includes(team.id)) {
        team.members.forEach((m) => selectedTeamUserIds.add(m.userId));
      }
    });
  }

  return context.users.filter((u) => {
    if (u.level === "部门经理") return false;
    if (selectedTeamIds.length > 0) {
      return selectedTeamUserIds.has(u.id) || tasksByExecutor.has(u.id);
    }
    return true;
  });
}

// 1. All teams selected
const allFilteredTasks = filterTasks(tasks, []);
assert.strictEqual(allFilteredTasks.length, 2, "All tasks should be returned when team filter is empty");
const allUsers = buildGroupedUsers(allFilteredTasks, context, []);
assert.strictEqual(allUsers.length, 3, "All non-manager users should be returned when team filter is empty");

// 2. Select Team A
const teamAFilteredTasks = filterTasks(tasks, ["teamA"]);
assert.strictEqual(teamAFilteredTasks.length, 1, "Only Team A task returned");
assert.strictEqual(teamAFilteredTasks[0].id, "t1");
const teamAUsers = buildGroupedUsers(teamAFilteredTasks, context, ["teamA"]);
assert.strictEqual(teamAUsers.length, 1, "Only Team A member u1 should be returned");
assert.strictEqual(teamAUsers[0].id, "u1");

// 3. Select Team A and Team B
const teamABFilteredTasks = filterTasks(tasks, ["teamA", "teamB"]);
assert.strictEqual(teamABFilteredTasks.length, 2, "Team A and Team B tasks returned");
const teamABUsers = buildGroupedUsers(teamABFilteredTasks, context, ["teamA", "teamB"]);
assert.strictEqual(teamABUsers.length, 2, "Team A and Team B members (u1, u2) returned, excluding u3");

console.log("All Gantt team filter assertion checks passed successfully!");
