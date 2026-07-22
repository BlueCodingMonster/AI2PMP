import { getProductTree } from "@/actions/product-lines";
import ProductVersionsManager from "@/components/product-lines/product-versions-manager";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "SDLC · 产品线管理",
  description: "产品及版本维护",
};

export default async function ProductCatalogPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const result = await getProductTree();
  return <ProductVersionsManager versionTree={result.success ? result.data : []} />;
}
