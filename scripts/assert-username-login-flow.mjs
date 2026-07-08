import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const failures = [];

function expectContains(path, pattern, message) {
  const source = read(path);
  if (!pattern.test(source)) {
    failures.push(`${path}: ${message}`);
  }
}

function expectNotContains(path, pattern, message) {
  const source = read(path);
  if (pattern.test(source)) {
    failures.push(`${path}: ${message}`);
  }
}

expectContains("prisma/schema.prisma", /username\s+String\s+@unique/, "User.username must be the unique login identifier.");
expectContains("prisma/schema.prisma", /email\s+String\?/, "User.email should be optional metadata, not required login identity.");
expectContains("src/lib/auth.ts", /username:\s*\{\s*label:\s*"登录名"/, "Credentials provider must ask for username.");
expectContains("src/lib/auth.ts", /where:\s*\{\s*username\s*\}/, "Credentials lookup must use username.");
expectNotContains("src/lib/auth.ts", /where:\s*\{\s*email\s*\}/, "Credentials lookup must not use email.");
expectContains("src/lib/validations/team.ts", /username:/, "Team validation must include username.");
expectNotContains("src/lib/validations/team.ts", /email:\s*z\.string\(\)\.email/, "Team login validation must not require email format.");
expectContains("src/app/(auth)/login/page.tsx", /登录名/, "Login page must show 登录名.");
expectNotContains("src/app/(auth)/login/page.tsx", /邮箱地址|type="email"|autoComplete="email"/, "Login page must not present email as login identity.");
expectContains("src/components/team/member-modal.tsx", /登录名 \*/, "Team member modal must collect 登录名.");
expectNotContains("src/components/team/member-modal.tsx", /企业邮箱 \*|type="email"/, "Team member modal must not require enterprise email.");
expectContains("prisma/seed.ts", /username:\s*'admin'/, "Seed admin must use username admin.");

if (failures.length > 0) {
  console.error("Username login regression checks failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Username login regression checks passed.");
