import Link from "next/link";
import { db } from "@/lib/db";
import { buildProductReadiness } from "@/lib/product-readiness";
import { EmptyState, MarketplaceBadge, PageHeader, StatCard, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [products, mappings, categories, brands, jobs, activities] = await Promise.all([
    db.product.findMany({ include: { images: true } }),
    db.categoryMapping.findMany({ where: { marketplace: "trendyol" } }),
    db.marketplaceCategoryCache.findMany({ where: { marketplace: "trendyol" }, select: { externalId: true, name: true } }),
    db.marketplaceBrandCache.findMany({ where: { marketplace: "trendyol" }, select: { externalId: true, name: true } }),
    db.exportJob.findMany({ take: 8, orderBy: { createdAt: "desc" }, include: { _count: { select: { items: true } } } }),
    db.productActivity.findMany({ take: 10, orderBy: { createdAt: "desc" }, include: { product: { select: { titleSource: true, titleEdited: true } } } }),
  ]);
  const readiness = products.map((product) => buildProductReadiness(product, mappings, { categories, brands }).readiness);
  return <main className="px-4 py-8 md:px-8"><div className="mx-auto max-w-7xl space-y-6">
    <PageHeader title="Genel Durum" description="Ürün operasyonlarını, pazaryeri hazırlığını ve son dışa aktarımları tek ekrandan takip edin." actions={<><Link href="/review" className="rounded-xl border px-4 py-2 text-sm font-semibold">İnceleme Kuyruğu</Link><Link href="/export" className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white">Dışa Aktarım Oluştur</Link></>} />
    <section><h2 className="mb-3 text-lg font-semibold">Ürün Durumu</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><StatCard label="Toplam Ürün" value={products.length} /><StatCard label="Hazır Ürün" value={products.filter((p) => p.status === "ready").length} /><StatCard label="İncelenecek Ürün" value={products.filter((p) => p.status === "needs_review").length} /></div></section>
    <section><h2 className="mb-3 text-lg font-semibold">Pazaryeri Hazırlığı</h2><div className="grid gap-4 sm:grid-cols-2"><StatCard label="Shopify Eksik Bilgili" value={readiness.filter((r) => !r.shopify.ready).length} /><StatCard label="Trendyol Eksik Bilgili" value={readiness.filter((r) => !r.trendyol.ready).length} /></div></section>
    <section className="grid gap-6 lg:grid-cols-2"><div className="rounded-[28px] border bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">Son Dışa Aktarımlar</h2><div className="mt-4 divide-y">{jobs.length ? jobs.map((job) => <Link key={job.id} href={`/export/jobs/${job.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-gray-50"><span className="flex items-center gap-2"><MarketplaceBadge marketplace={job.targetMarketplace} /><span className="text-sm">{job._count.items} ürün</span></span><StatusBadge status={job.status} /></Link>) : <EmptyState title="Henüz dışa aktarım işi yok" />}</div></div><div className="rounded-[28px] border bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">Son Aktiviteler</h2><div className="mt-4 divide-y">{activities.length ? activities.map((a) => <Link key={a.id} href={`/products/${a.productId}`} className="block py-3 hover:bg-gray-50"><div className="text-sm font-medium">{a.message}</div><div className="mt-1 text-xs text-gray-500">{a.product.titleEdited ?? a.product.titleSource} · {a.createdAt.toLocaleString("tr-TR")}</div></Link>) : <EmptyState title="Henüz aktivite yok" />}</div></div></section>
    <section className="rounded-[28px] border bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">Hızlı İşlemler</h2><div className="mt-4 flex flex-wrap gap-2"><Link href="/products/new" className="rounded-xl border px-4 py-2 text-sm font-semibold">Yeni Ürün</Link><Link href="/bulk/price-stock" className="rounded-xl border px-4 py-2 text-sm font-semibold">Toplu Fiyat/Stok</Link><Link href="/assistant/missing-data" className="rounded-xl border px-4 py-2 text-sm font-semibold">Eksik Verileri Tamamla</Link></div></section>
  </div></main>;
}
