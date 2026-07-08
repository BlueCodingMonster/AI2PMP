import { readFileSync } from "node:fs";

const page = readFileSync("src/app/(dashboard)/product-lines/[teamId]/page.tsx", "utf8");
const action = readFileSync("src/actions/product-lines.ts", "utf8");

const failures = [];

if (!page.includes("getEligibleUsersForTeam")) {
  failures.push("Product-line detail page must use getEligibleUsersForTeam for member candidates.");
}

if (/getAssignees\(\)/.test(page)) {
  failures.push("Product-line detail page must not use getAssignees for product-line member candidates.");
}

if (!/select:\s*\{\s*id:\s*true,\s*name:\s*true,\s*username:\s*true,\s*email:\s*true,\s*department:\s*true\s*\}/s.test(action)) {
  failures.push("getEligibleUsersForTeam must select department.");
}

if (failures.length > 0) {
  console.error("Product-line department source checks failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Product-line department source checks passed.");
