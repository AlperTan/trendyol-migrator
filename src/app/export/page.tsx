import Link from "next/link";
import ExportWorkflow from "./export-workflow";

export default function ExportPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700">
            Ürünlere Dön
          </Link>
          <Link href="/export/jobs" className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700">
            Dışa Aktarım İşleri
          </Link>
        </div>
        <ExportWorkflow />
      </div>
    </main>
  );
}
