"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Product = {
  id: string; titleSource: string; titleEdited: string | null; sku: string | null;
  barcode: string | null; salePriceSource: number | null; salePriceEdited: number | null;
  stock: number; status: string; sourceStatus: string | null;
  images: Array<{ id: string; sourceUrl: string; localPath: string | null; isSelected: boolean }>;
};
type Account = { id: string; marketplace: string; name: string; isActive: boolean };
type Warning = { productId: string; title: string; errors: string[]; warnings: string[] };

const marketplaces = [
  ["shopify", "Shopify", false], ["trendyol", "Trendyol - coming soon", true],
  ["n11", "n11 - coming soon", true], ["hepsiburada", "Hepsiburada - coming soon", true],
  ["pttavm", "PttAVM - coming soon", true], ["amazon", "Amazon - coming soon", true],
] as const;

function displayTitle(product: Product) { return product.titleEdited ?? product.titleSource; }
function displayPrice(product: Product) { return product.salePriceEdited ?? product.salePriceSource; }
function validateProduct(product: Product): Warning {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!displayTitle(product).trim()) errors.push("Missing title");
  if (displayPrice(product) == null || Number(displayPrice(product)) < 0) errors.push("Missing price");
  if (!product.sku) warnings.push("Missing SKU");
  if (!product.images.some((image) => image.isSelected)) warnings.push("No selected/exportable image");
  return { productId: product.id, title: displayTitle(product), errors, warnings };
}

export default function ExportWorkflow() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [marketplace, setMarketplace] = useState("shopify");
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void Promise.all([
      fetch("/api/products?pageSize=100&status=approved,archived,blacklisted,unknown,local", { cache: "no-store" }).then((res) => res.json()),
      fetch("/api/marketplace-accounts", { cache: "no-store" }).then((res) => res.json()),
    ]).then(([productData, accountData]) => {
      setProducts(productData.items ?? []);
      setAccounts(Array.isArray(accountData) ? accountData : []);
      setLoading(false);
    }).catch(() => {
      toast.error("Export data could not be loaded");
      setLoading(false);
    });
  }, []);

  const visibleProducts = useMemo(() => products.filter((product) => {
    const haystack = `${displayTitle(product)} ${product.sku ?? ""} ${product.barcode ?? ""}`.toLocaleLowerCase("tr-TR");
    return haystack.includes(search.toLocaleLowerCase("tr-TR")) && (!status || product.status === status);
  }), [products, search, status]);
  const selectedProducts = products.filter((product) => selectedIds.includes(product.id));
  const validations = selectedProducts.map(validateProduct);
  const blockingCount = validations.reduce((sum, item) => sum + item.errors.length, 0) + (marketplace === "shopify" ? 0 : 1);
  const matchingAccounts = accounts.filter((account) => account.marketplace === marketplace && account.isActive);
  const allVisibleSelected = visibleProducts.length > 0 && visibleProducts.every((product) => selectedIds.includes(product.id));

  function toggleAllVisible() {
    const visibleIds = visibleProducts.map((product) => product.id);
    setSelectedIds((current) => allVisibleSelected ? current.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...current, ...visibleIds])));
  }

  async function createJob() {
    if (!selectedIds.length) return toast.error("Select at least one product");
    if (blockingCount) return toast.error("Resolve blocking validation errors first");
    setCreating(true);
    try {
      const response = await fetch("/api/export-jobs", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetMarketplace: marketplace, marketplaceAccountId: accountId || undefined, productIds: selectedIds }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Export job could not be created");
      router.push(`/export/jobs/${data.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export job could not be created");
      setCreating(false);
    }
  }

  return (
    <>
      <section className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Export products</h1>
        <p className="mt-2 text-sm text-gray-500">Select products and create a Shopify export job. Creating a job does not run it automatically.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label className="text-sm font-medium text-gray-700">Marketplace<select value={marketplace} onChange={(e) => { setMarketplace(e.target.value); setAccountId(""); }} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3">{marketplaces.map(([value, label, disabled]) => <option key={value} value={value} disabled={disabled}>{label}</option>)}</select></label>
          <label className="text-sm font-medium text-gray-700">Marketplace account<select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3"><option value="">Use environment configuration</option>{matchingAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} (masked credentials)</option>)}</select></label>
          <div className="flex items-end"><button onClick={createJob} disabled={creating || !selectedIds.length || blockingCount > 0} className="w-full rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{creating ? "Creating..." : `Create export job (${selectedIds.length})`}</button></div>
        </div>
      </section>

      <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, SKU, or barcode" className="rounded-xl border border-gray-200 px-4 py-3 text-sm" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-gray-200 px-4 py-3 text-sm"><option value="">All product statuses</option><option value="draft">draft</option><option value="ready">ready</option><option value="exported">exported</option></select>
          <button onClick={toggleAllVisible} className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700">{allVisibleSelected ? "Clear visible" : "Select all visible"}</button>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500"><tr><th className="px-3 py-3">Select</th><th className="px-3 py-3">Image</th><th className="px-3 py-3">Title</th><th className="px-3 py-3">SKU</th><th className="px-3 py-3">Price</th><th className="px-3 py-3">Stock</th><th className="px-3 py-3">Status</th></tr></thead>
            <tbody>{loading ? <tr><td colSpan={7} className="p-8 text-center text-gray-500">Loading...</td></tr> : visibleProducts.map((product) => {
              const image = product.images[0]; const src = image?.localPath ?? image?.sourceUrl;
              return <tr key={product.id} className="border-t border-gray-100"><td className="px-3 py-3"><input type="checkbox" checked={selectedIds.includes(product.id)} onChange={() => setSelectedIds((current) => current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id])} /></td><td className="px-3 py-3">{src ? <Image src={src} alt="" width={48} height={48} unoptimized className="h-12 w-12 rounded-lg object-cover" /> : "-"}</td><td className="px-3 py-3 font-medium text-gray-900">{displayTitle(product)}</td><td className="px-3 py-3 text-gray-600">{product.sku ?? "-"}</td><td className="px-3 py-3 text-gray-600">{displayPrice(product) ?? "-"}</td><td className="px-3 py-3 text-gray-600">{product.stock}</td><td className="px-3 py-3 text-gray-600">{product.status}</td></tr>;
            })}</tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Validation preview</h2>
        {!selectedProducts.length ? <p className="mt-3 text-sm text-gray-500">Select products to preview validation.</p> : <div className="mt-4 space-y-3">{marketplace !== "shopify" ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">Selected marketplace is not supported yet.</p> : null}{validations.map((item) => <div key={item.productId} className="rounded-xl border border-gray-200 p-3"><div className="font-medium text-gray-900">{item.title || item.productId}</div>{item.errors.map((error) => <div key={error} className="mt-1 text-sm text-rose-700">Blocking: {error}</div>)}{item.warnings.map((warning) => <div key={warning} className="mt-1 text-sm text-amber-700">Warning: {warning}</div>)}{!item.errors.length && !item.warnings.length ? <div className="mt-1 text-sm text-emerald-700">Ready</div> : null}</div>)}</div>}
      </section>
    </>
  );
}
