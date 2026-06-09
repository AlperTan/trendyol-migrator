"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { MarketplaceReadiness } from "@/core/readiness";

type Product = {
  id: string; titleSource: string; titleEdited: string | null; sku: string | null;
  barcode: string | null; salePriceSource: number | null; salePriceEdited: number | null;
  stock: number; currency: string; status: string; sourceStatus: string | null;
  vatRateSource: number | null; vatRateEdited: number | null; productMainId: string | null;
  brandId: number | null; categoryId: number | null;
  images: Array<{ id: string; sourceUrl: string; localPath: string | null; isSelected: boolean }>;
  readiness: MarketplaceReadiness;
};
type Account = { id: string; marketplace: string; name: string; isActive: boolean };
type Warning = { productId: string; title: string; errors: string[]; warnings: string[] };

const marketplaces = [
  ["shopify", "Shopify", false], ["trendyol", "Trendyol", false],
  ["n11", "n11 - yakında", true], ["hepsiburada", "Hepsiburada - yakında", true],
  ["pttavm", "PttAVM - yakında", true], ["amazon", "Amazon - yakında", true],
] as const;

function displayTitle(product: Product) { return product.titleEdited ?? product.titleSource; }
function displayPrice(product: Product) { return product.salePriceEdited ?? product.salePriceSource; }
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
      toast.error("Dışa aktarım verileri yüklenemedi");
      setLoading(false);
    });
  }, []);

  const visibleProducts = useMemo(() => products.filter((product) => {
    const haystack = `${displayTitle(product)} ${product.sku ?? ""} ${product.barcode ?? ""}`.toLocaleLowerCase("tr-TR");
    return haystack.includes(search.toLocaleLowerCase("tr-TR")) && (!status || product.status === status);
  }), [products, search, status]);
  const selectedProducts = products.filter((product) => selectedIds.includes(product.id));
  const validations: Warning[] = selectedProducts.map((product) => {
    const result = marketplace === "trendyol" ? product.readiness.trendyol : product.readiness.shopify;
    return { productId: product.id, title: displayTitle(product), errors: result.errors, warnings: result.warnings };
  });
  const supportedMarketplace = marketplace === "shopify" || marketplace === "trendyol";
  const blockingCount = validations.reduce((sum, item) => sum + item.errors.length, 0) + (supportedMarketplace ? 0 : 1);
  const matchingAccounts = accounts.filter((account) => account.marketplace === marketplace && account.isActive);
  const allVisibleSelected = visibleProducts.length > 0 && visibleProducts.every((product) => selectedIds.includes(product.id));

  function toggleAllVisible() {
    const visibleIds = visibleProducts.map((product) => product.id);
    setSelectedIds((current) => allVisibleSelected ? current.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...current, ...visibleIds])));
  }

  async function createJob() {
    if (!selectedIds.length) return toast.error("En az bir ürün seçin");
    if (blockingCount) return toast.error("Önce dışa aktarımı engelleyen hataları giderin");
    setCreating(true);
    try {
      const response = await fetch("/api/export-jobs", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetMarketplace: marketplace, marketplaceAccountId: accountId || undefined, productIds: selectedIds }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Dışa aktarım işi oluşturulamadı");
      router.push(`/export/jobs/${data.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Dışa aktarım işi oluşturulamadı");
      setCreating(false);
    }
  }

  return (
    <>
      <section className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Dışa Aktarım Oluştur</h1>
        <p className="mt-2 text-sm text-gray-500">Ürünleri ve pazaryerini seçin, kontrolleri inceleyin ve dışa aktarım işi oluşturun. İş otomatik olarak çalıştırılmaz.</p>
        {marketplace === "trendyol" ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Trendyol dışa aktarımı toplu istek gönderir. Nihai onay veya hatalar daha sonra görünebilir.</p> : null}
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label className="text-sm font-medium text-gray-700">Pazaryeri<select value={marketplace} onChange={(e) => { setMarketplace(e.target.value); setAccountId(""); }} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3">{marketplaces.map(([value, label, disabled]) => <option key={value} value={value} disabled={disabled}>{label}</option>)}</select></label>
          <label className="text-sm font-medium text-gray-700">Pazaryeri Hesabı<select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3"><option value="">Ortam değişkenlerini kullan</option>{matchingAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} (gizli bilgiler)</option>)}</select></label>
          <div className="flex items-end"><button onClick={createJob} disabled={creating || !selectedIds.length || blockingCount > 0} className="w-full rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{creating ? "Oluşturuluyor..." : `Dışa Aktarım İşi Oluştur (${selectedIds.length})`}</button></div>
        </div>
      </section>

      <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ürün adı, stok kodu veya barkod ara" className="rounded-xl border border-gray-200 px-4 py-3 text-sm" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-gray-200 px-4 py-3 text-sm"><option value="">Tüm ürün durumları</option><option value="draft">Taslak</option><option value="ready">Hazır</option><option value="exported">Dışa Aktarıldı</option></select>
          <button onClick={toggleAllVisible} className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700">{allVisibleSelected ? "Görünen Seçimi Kaldır" : "Görünenlerin Tümünü Seç"}</button>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500"><tr><th className="px-3 py-3">Seç</th><th className="px-3 py-3">Görsel</th><th className="px-3 py-3">Ürün</th><th className="px-3 py-3">Stok Kodu</th><th className="px-3 py-3">Fiyat</th><th className="px-3 py-3">Stok</th><th className="px-3 py-3">Durum</th></tr></thead>
            <tbody>{loading ? <tr><td colSpan={7} className="p-8 text-center text-gray-500">Yükleniyor...</td></tr> : visibleProducts.map((product) => {
              const image = product.images[0]; const src = image?.localPath ?? image?.sourceUrl;
              return <tr key={product.id} className="border-t border-gray-100"><td className="px-3 py-3"><input type="checkbox" checked={selectedIds.includes(product.id)} onChange={() => setSelectedIds((current) => current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id])} /></td><td className="px-3 py-3">{src ? <Image src={src} alt="" width={48} height={48} unoptimized className="h-12 w-12 rounded-lg object-cover" /> : "-"}</td><td className="px-3 py-3 font-medium text-gray-900">{displayTitle(product)}</td><td className="px-3 py-3 text-gray-600">{product.sku ?? "-"}</td><td className="px-3 py-3 text-gray-600">{displayPrice(product) ?? "-"}</td><td className="px-3 py-3 text-gray-600">{product.stock}</td><td className="px-3 py-3 text-gray-600">{product.status}</td></tr>;
            })}</tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Kontrol Sonuçları</h2>
        {!selectedProducts.length ? <p className="mt-3 text-sm text-gray-500">Kontrol sonuçlarını görmek için ürün seçin.</p> : <div className="mt-4 space-y-3">{!supportedMarketplace ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">Seçilen pazaryeri henüz desteklenmiyor.</p> : null}{validations.map((item) => <div key={item.productId} className="rounded-xl border border-gray-200 p-3"><div className="font-medium text-gray-900">{item.title || item.productId}</div>{item.errors.map((error) => <div key={error} className="mt-1 text-sm text-rose-700">Engel: {error}</div>)}{item.warnings.map((warning) => <div key={warning} className="mt-1 text-sm text-amber-700">Uyarı: {warning}</div>)}{!item.errors.length && !item.warnings.length ? <div className="mt-1 text-sm text-emerald-700">Hazır</div> : null}</div>)}</div>}
      </section>
    </>
  );
}
