import { readFileSync, existsSync } from "node:fs";

const checks = [
  {
    file: "src/actions/product-lines.ts",
    includes: [
      "getProductTree",
      "createProduct",
      "updateProduct",
      "deleteProduct",
      "createProductVersion",
      "updateProductVersion",
      "deleteProductVersion",
    ],
  },
  {
    file: "src/components/product-lines/product-versions-manager.tsx",
    includes: [
      "ProductVersionsManager",
      "createProduct",
      "createProductVersion",
      "updateProductVersion",
      "deleteProductVersion",
    ],
  },
  {
    file: "src/app/(dashboard)/product-catalog/page.tsx",
    includes: ["getProductTree", "ProductVersionsManager"],
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

const teamDetailPage = "src/app/(dashboard)/product-lines/[teamId]/page.tsx";
if (existsSync(teamDetailPage) && readFileSync(teamDetailPage, "utf8").includes("ProductVersionsManager")) {
  failures.push(`${teamDetailPage}: product/version maintenance must be kept in product-catalog`);
}

const manager = readFileSync("src/components/product-lines/product-versions-manager.tsx", "utf8");
for (const removedField of ["versionTitle", "versionDescription", "setStartDate", "setReleaseDate", "setVersionStatus"]) {
  if (manager.includes(removedField)) failures.push(`version form must not contain ${removedField}`);
}
for (const action of ["updateProduct", "deleteProduct"]) {
  if (!manager.includes(action)) failures.push(`product list must expose ${action}`);
}
for (const removedField of ["statusLabels", "statusClasses", "updateProductVersionStatus"]) {
  if (manager.includes(removedField)) failures.push(`version list must not contain ${removedField}`);
}
for (const action of ["updateProductVersion", "deleteProductVersion"]) {
  if (!manager.includes(action)) failures.push(`version list must expose ${action}`);
}

const schema = readFileSync("prisma/schema.prisma", "utf8");
if (schema.includes("model ProductModule")) failures.push("prisma/schema.prisma: ProductModule must be removed");
if (!/product\s+Product\s+@relation\(fields: \[productId\]/.test(schema)) failures.push("prisma/schema.prisma: ProductVersion must belong directly to Product");
if (/model Product \{[\s\S]*?productLineTeamId/.test(schema)) failures.push("prisma/schema.prisma: Product must not belong to ProductLineTeam");
if (/model ProductVersion \{[\s\S]*?productLineTeamId/.test(schema)) failures.push("prisma/schema.prisma: ProductVersion must not belong to ProductLineTeam");

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Product version maintenance checks passed.");
