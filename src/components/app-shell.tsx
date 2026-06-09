"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const primaryLinks = [
  ["/dashboard", "Panel"], ["/", "Ürünler"], ["/review", "İnceleme Kuyruğu"],
  ["/readiness", "Hazırlık Durumu"], ["/export", "Dışa Aktarım"],
  ["/export/jobs", "Dışa Aktarım İşleri"], ["/bulk/price-stock", "Toplu Fiyat/Stok"],
  ["/duplicates", "Yinelenen Ürünler"], ["/assistant/missing-data", "Eksik Veri Asistanı"],
] as const;
const settingsLinks = [
  ["/settings/marketplace-accounts", "Pazaryerleri"],
  ["/settings/category-mappings", "Kategori Eşleştirmeleri"],
  ["/settings/attribute-mappings", "Özellik Eşleştirmeleri"],
  ["/settings/product-templates", "Ürün Şablonları"],
  ["/settings/marketplace-data", "Pazaryeri Verileri"],
] as const;

function SidebarLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  return <Link href={href} className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-gray-900 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}>{label}</Link>;
}

export function Sidebar() {
  return <aside className="border-b border-gray-200 bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-64 lg:border-b-0 lg:border-r"><div className="flex h-16 items-center border-b border-gray-100 px-5"><Link href="/dashboard" className="text-lg font-bold tracking-tight text-gray-900">Pazaryeri Paneli</Link></div><div className="max-h-[calc(100vh-4rem)] overflow-y-auto p-3"><nav className="space-y-1">{primaryLinks.map(([href, label]) => <SidebarLink key={href} href={href} label={label} />)}</nav><div className="mb-2 mt-6 px-3 text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Ayarlar</div><nav className="space-y-1">{settingsLinks.map(([href, label]) => <SidebarLink key={href} href={href} label={label} />)}</nav></div></aside>;
}

export function Topbar() {
  return <header className="sticky top-0 z-30 hidden h-16 items-center justify-between border-b border-gray-200 bg-white/90 px-6 backdrop-blur lg:flex"><div className="text-sm font-medium text-gray-500">Ürün ve pazaryeri operasyonları</div><div className="flex gap-2"><Link href="/products/new" className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Yeni Ürün</Link><Link href="/export" className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">Dışa Aktarım Oluştur</Link></div></header>;
}

export default function AppShell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-gray-50"><Sidebar /><div className="lg:pl-64"><Topbar />{children}</div></div>;
}
