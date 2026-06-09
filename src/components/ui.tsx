import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return <section className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>{description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">{description}</p> : null}</div>{actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}</div></section>;
}
export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm"><div className="text-sm font-medium text-gray-500">{label}</div><div className="mt-2 text-3xl font-bold text-gray-900">{value}</div>{hint ? <div className="mt-2 text-xs text-gray-500">{hint}</div> : null}</div>;
}
const labels: Record<string, string> = { draft: "Taslak", ready: "Hazır", exported: "Dışa Aktarıldı", needs_review: "İncelenecek", archived: "Arşivlendi", pending: "Bekliyor", running: "Çalışıyor", completed: "Tamamlandı", failed: "Başarısız", skipped: "Atlandı" };
export function StatusBadge({ status }: { status: string }) {
  const color = status === "ready" || status === "completed" || status === "exported" ? "bg-emerald-50 text-emerald-700" : status === "failed" || status === "needs_review" ? "bg-rose-50 text-rose-700" : status === "running" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-700";
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${color}`}>{labels[status] ?? status}</span>;
}
export function MarketplaceBadge({ marketplace }: { marketplace: string }) { return <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold capitalize text-indigo-700">{marketplace}</span>; }
export function EmptyState({ title, description }: { title: string; description?: string }) { return <div className="rounded-[24px] border border-dashed border-gray-300 bg-gray-50 p-8 text-center"><div className="font-semibold text-gray-800">{title}</div>{description ? <p className="mt-2 text-sm text-gray-500">{description}</p> : null}</div>; }
export function LoadingState({ label = "Yükleniyor..." }: { label?: string }) { return <div className="p-8 text-center text-sm text-gray-500">{label}</div>; }
