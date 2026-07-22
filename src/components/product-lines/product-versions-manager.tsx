"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Box, Boxes, Check, GitBranch, Loader2, PackagePlus, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { createProduct, createProductVersion, deleteProduct, deleteProductVersion, updateProduct, updateProductVersion } from "@/actions/product-lines";

type ProductTree = Array<{
  id: string;
  name: string;
  description: string | null;
  versions: Array<{
    id: string;
    version: string;
  }>;
}>;

const inputClass = "rounded-lg border border-border bg-input px-3 py-2 text-white outline-none transition focus:border-cyan-500/60";

export default function ProductVersionsManager({ versionTree }: { versionTree: ProductTree }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState(versionTree[0]?.id ?? "");
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [versionNo, setVersionNo] = useState("");
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [editVersionNo, setEditVersionNo] = useState("");

  useEffect(() => {
    if (!versionTree.some((product) => product.id === selectedProductId)) setSelectedProductId(versionTree[0]?.id ?? "");
  }, [selectedProductId, versionTree]);

  const filteredProducts = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return keyword ? versionTree.filter((product) => product.name.toLowerCase().includes(keyword)) : versionTree;
  }, [query, versionTree]);
  const selectedProduct = versionTree.find((product) => product.id === selectedProductId) ?? versionTree[0];
  const totalVersions = versionTree.reduce((sum, product) => sum + product.versions.length, 0);

  const submitProduct = (event: React.FormEvent) => {
    event.preventDefault(); setError(null);
    startTransition(async () => {
      const result = await createProduct({ name: productName, description: productDescription || null });
      if (!result.success) return setError(result.error ?? "新增产品失败");
      setProductName(""); setProductDescription(""); setShowProductForm(false); router.refresh();
    });
  };

  const submitVersion = (event: React.FormEvent) => {
    event.preventDefault(); setError(null);
    if (!selectedProduct) return setError("请先选择产品");
    startTransition(async () => {
      const result = await createProductVersion({
        productId: selectedProduct.id, version: versionNo,
      });
      if (!result.success) return setError(result.error ?? "新增版本失败");
      setVersionNo(""); router.refresh();
    });
  };

  const beginEdit = (product: ProductTree[number]) => {
    setEditingProductId(product.id); setEditName(product.name); setEditDescription(product.description ?? ""); setError(null);
  };

  const submitEdit = (event: React.FormEvent, productId: string) => {
    event.preventDefault(); setError(null);
    startTransition(async () => {
      const result = await updateProduct(productId, { name: editName, description: editDescription || null });
      if (!result.success) return setError(result.error ?? "编辑产品失败");
      setEditingProductId(null); router.refresh();
    });
  };

  const removeProduct = (product: ProductTree[number]) => {
    if (!window.confirm(`确认删除“${product.name}”及其全部 ${product.versions.length} 个版本吗？此操作不可恢复。`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteProduct(product.id);
      if (!result.success) return setError(result.error ?? "删除产品失败");
      if (selectedProductId === product.id) setSelectedProductId("");
      router.refresh();
    });
  };

  const submitVersionEdit = (event: React.FormEvent, versionId: string) => {
    event.preventDefault(); setError(null);
    startTransition(async () => {
      const result = await updateProductVersion(versionId, { version: editVersionNo });
      if (!result.success) return setError(result.error ?? "编辑版本失败");
      setEditingVersionId(null); router.refresh();
    });
  };

  const removeVersion = (version: ProductTree[number]["versions"][number]) => {
    if (!window.confirm(`确认删除版本“${version.version}”吗？此操作不可恢复。`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteProductVersion(version.id);
      if (!result.success) return setError(result.error ?? "删除版本失败");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <header className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-300"><Boxes className="h-4 w-4" /></div>
          <div><h1 className="text-xl font-bold leading-9 tracking-tight text-white">产品线管理</h1><p className="mt-0.5 text-xs text-muted-foreground">全局维护产品及版本，一个产品可包含多个版本。</p></div>
        </div>
        <div className="flex gap-2 text-[11px]">
          <span className="rounded-md border border-border bg-white/[0.03] px-2.5 py-1.5 text-muted-foreground"><strong className="mr-1 text-white">{versionTree.length}</strong>产品</span>
          <span className="rounded-md border border-border bg-white/[0.03] px-2.5 py-1.5 text-muted-foreground"><strong className="mr-1 text-white">{totalVersions}</strong>版本</span>
        </div>
      </header>

      {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}

      <div className="grid min-h-[620px] grid-cols-1 overflow-hidden rounded-xl border border-border/60 bg-black/10 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="border-b border-border/60 bg-black/10 p-3 lg:border-b-0 lg:border-r">
          <div className="mb-3 flex items-center justify-between px-1">
            <div><h2 className="text-sm font-semibold text-white">产品列表</h2><p className="mt-0.5 text-[10px] text-muted-foreground">选择产品维护版本</p></div>
            <button onClick={() => setShowProductForm((value) => !value)} className="inline-flex h-8 items-center gap-1 rounded-md bg-cyan-600 px-2.5 text-[11px] font-semibold text-white hover:bg-cyan-500"><Plus className="h-3.5 w-3.5" />产品</button>
          </div>

          {showProductForm && (
            <form onSubmit={submitProduct} className="mb-3 space-y-2 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.04] p-2.5">
              <input required autoFocus value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="产品名称" className={`${inputClass} w-full text-xs`} />
              <textarea rows={2} value={productDescription} onChange={(e) => setProductDescription(e.target.value)} placeholder="范围说明，可选" className={`${inputClass} w-full resize-none text-xs`} />
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowProductForm(false)} className="px-2 py-1 text-[11px] text-muted-foreground">取消</button><button disabled={isPending} className="rounded bg-cyan-600 px-2.5 py-1 text-[11px] font-semibold text-white">保存</button></div>
            </form>
          )}

          <label className="relative mb-2 block"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索产品" className={`${inputClass} w-full pl-8 text-xs`} /></label>

          <div className="space-y-1">
            {filteredProducts.length === 0 ? <p className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">暂无匹配产品</p> : filteredProducts.map((product) => {
              const selected = product.id === selectedProduct?.id;
              return <div key={product.id} className="space-y-1">
                <div className={`group flex w-full items-center gap-1 rounded-lg px-2 py-2 transition ${selected ? "bg-cyan-500/10 text-cyan-200 ring-1 ring-cyan-500/25" : "text-slate-300 hover:bg-white/[0.04]"}`}>
                  <button onClick={() => setSelectedProductId(product.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <Box className={`h-4 w-4 shrink-0 ${selected ? "text-cyan-400" : "text-slate-500"}`} />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium">{product.name}</span>
                    <span className="rounded bg-black/20 px-1.5 py-0.5 text-[10px] text-muted-foreground">{product.versions.length}</span>
                  </button>
                  <button title="编辑产品" onClick={() => beginEdit(product)} className="rounded p-1 text-muted-foreground opacity-0 hover:bg-white/10 hover:text-cyan-300 group-hover:opacity-100 focus:opacity-100"><Pencil className="h-3 w-3" /></button>
                  <button title="删除产品" onClick={() => removeProduct(product)} className="rounded p-1 text-muted-foreground opacity-0 hover:bg-red-500/10 hover:text-red-300 group-hover:opacity-100 focus:opacity-100"><Trash2 className="h-3 w-3" /></button>
                </div>
                {editingProductId === product.id && <form onSubmit={(event) => submitEdit(event, product.id)} className="space-y-2 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.04] p-2.5">
                  <input required autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} className={`${inputClass} w-full text-xs`} />
                  <textarea rows={2} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="范围说明，可选" className={`${inputClass} w-full resize-none text-xs`} />
                  <div className="flex justify-end gap-1"><button type="button" title="取消" onClick={() => setEditingProductId(null)} className="rounded p-1.5 text-muted-foreground hover:bg-white/5"><X className="h-3.5 w-3.5" /></button><button disabled={isPending} title="保存" className="rounded bg-cyan-600 p-1.5 text-white"><Check className="h-3.5 w-3.5" /></button></div>
                </form>}
              </div>;
            })}
          </div>
        </aside>

        <main className="min-w-0 p-4 lg:p-5">
          {!selectedProduct ? <div className="flex h-full min-h-[420px] items-center justify-center text-sm text-muted-foreground">请先新增产品</div> : <div className="space-y-4">
            <div className="flex flex-col gap-2 border-b border-border/50 pb-3 sm:flex-row sm:items-start sm:justify-between">
              <div><div className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-cyan-400" /><h2 className="text-base font-semibold text-white">{selectedProduct.name}</h2></div><p className="mt-1 max-w-3xl text-xs text-muted-foreground">{selectedProduct.description || "暂无范围说明"}</p></div>
              <span className="shrink-0 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300">{selectedProduct.versions.length} 个版本</span>
            </div>

            <form onSubmit={submitVersion} className="flex flex-col gap-2 rounded-lg border border-border/50 bg-white/[0.02] p-3 sm:flex-row">
              <input required value={versionNo} onChange={(e) => setVersionNo(e.target.value)} placeholder="输入版本号，如 v1.2.0" className={`${inputClass} min-w-0 flex-1 text-xs`} />
              <button disabled={isPending} className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">{isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PackagePlus className="h-3.5 w-3.5" />}新增版本</button>
            </form>

            <div className="overflow-hidden rounded-lg border border-border/50">
              <div className="grid grid-cols-[minmax(220px,1fr)_auto] gap-3 bg-white/[0.03] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"><span>版本号</span><span className="pr-1 text-right">操作</span></div>
              {selectedProduct.versions.length === 0 ? <div className="py-14 text-center text-xs text-muted-foreground">暂无版本，可在上方快速新增。</div> : selectedProduct.versions.map((item) => (
                <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border/40 px-3 py-3 transition hover:bg-white/[0.02]">
                  {editingVersionId === item.id ? <form onSubmit={(event) => submitVersionEdit(event, item.id)} className="flex min-w-0 items-center gap-2"><input required autoFocus value={editVersionNo} onChange={(event) => setEditVersionNo(event.target.value)} className={`${inputClass} h-8 min-w-0 flex-1 text-xs`} /><button disabled={isPending} title="保存" className="rounded bg-cyan-600 p-1.5 text-white"><Check className="h-3.5 w-3.5" /></button><button type="button" title="取消" onClick={() => setEditingVersionId(null)} className="rounded p-1.5 text-muted-foreground hover:bg-white/5"><X className="h-3.5 w-3.5" /></button></form> : <span className="truncate text-xs font-semibold text-white">{item.version}</span>}
                  {editingVersionId !== item.id && <div className="flex items-center justify-end gap-1"><button title="编辑版本" onClick={() => { setEditingVersionId(item.id); setEditVersionNo(item.version); setError(null); }} className="rounded p-1.5 text-muted-foreground hover:bg-white/10 hover:text-cyan-300"><Pencil className="h-3.5 w-3.5" /></button><button title="删除版本" onClick={() => removeVersion(item)} className="rounded p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button></div>}
                </div>
              ))}
            </div>
          </div>}
        </main>
      </div>
    </div>
  );
}
