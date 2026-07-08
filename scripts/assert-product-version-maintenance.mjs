import { readFileSync, existsSync } from "node:fs";

const checks = [
  {
    file: "src/actions/product-lines.ts",
    includes: [
      "getProductVersionTree",
      "createProductPlatform",
      "createProductModule",
      "createProductVersion",
    ],
  },
  {
    file: "src/components/product-lines/product-versions-manager.tsx",
    includes: [
      "ProductVersionsManager",
      "createProductPlatform",
      "createProductModule",
      "createProductVersion",
      "ProductVersionStatus",
    ],
  },
  {
    file: "src/app/(dashboard)/product-lines/[teamId]/page.tsx",
    includes: ["getProductVersionTree", "ProductVersionsManager"],
  },
];

const failures = [];

for (const check of checks) {
  if (!existsSync(check.file)) {
    failures.push(`${check.file}: missing file`);
    continue;
  }

  const source = readFileSync(check.file, "utf8");
  for (const needle of check.includes) {
    if (!source.includes(needle)) {
      failures.push(`${check.file}: missing ${needle}`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Product version maintenance checks passed.");
