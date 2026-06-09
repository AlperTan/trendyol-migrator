import type { ProductCompleteness } from "@/core/completeness";

export default function ReadinessBadge({
  marketplace,
  readiness,
}: {
  marketplace: string;
  readiness: ProductCompleteness;
}) {
  return (
    <details className="group min-w-28">
      <summary className={`cursor-pointer list-none rounded-xl border px-3 py-2 text-xs font-semibold ${readiness.ready ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
        <span className="block">{marketplace}</span>
        <span>{readiness.ready ? "Hazır" : "Eksik Bilgili"} · {readiness.score}%</span>
      </summary>
      <div className="mt-2 w-64 rounded-xl border border-gray-200 bg-white p-3 text-xs shadow-lg">
        {readiness.errors.map((error) => <div key={error} className="text-rose-700">Engel: {error}</div>)}
        {readiness.warnings.map((warning) => <div key={warning} className="mt-1 text-amber-700">Uyarı: {warning}</div>)}
        {!readiness.errors.length && !readiness.warnings.length ? <div className="text-emerald-700">Dışa aktarıma hazır</div> : null}
      </div>
    </details>
  );
}
