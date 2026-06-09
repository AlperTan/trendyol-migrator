import Link from "next/link";

const links = [
  ["/dashboard", "Panel"],
  ["/", "Ürünler"],
  ["/review", "İnceleme Kuyruğu"],
  ["/bulk/price-stock", "Fiyat ve Stok"],
  ["/duplicates", "Yinelenen Ürünler"],
  ["/export/jobs", "Dışa Aktarım İşleri"],
] as const;

export default function OperationalNav() {
  return (
    <nav className="flex flex-wrap gap-2">
      {links.map(([href, label]) => (
        <Link key={href} href={href} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          {label}
        </Link>
      ))}
    </nav>
  );
}
