import Link from "next/link";

import { db } from "@/lib/db";

export default async function ExportJobsPage() {
  const jobs = await db.exportJob.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: {
      marketplaceAccount: { select: { name: true } },
      _count: { select: { items: true } },
      items: { select: { status: true } },
    },
  });

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/export" className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700">New export</Link>
          <Link href="/" className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700">Products</Link>
        </div>
        <section className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Export jobs</h1>
          <p className="mt-2 text-sm text-gray-500">Recent export jobs and their current results.</p>
        </section>
        <section className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500"><tr><th className="px-4 py-3">Marketplace</th><th className="px-4 py-3">Account</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Created</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Results</th><th className="px-4 py-3"></th></tr></thead>
              <tbody>{jobs.length ? jobs.map((job) => {
                const completed = job.items.filter((item) => item.status === "completed").length;
                const failed = job.items.filter((item) => item.status === "failed").length;
                return <tr key={job.id} className="border-t border-gray-100"><td className="px-4 py-3 font-medium text-gray-900">{job.targetMarketplace}</td><td className="px-4 py-3 text-gray-600">{job.marketplaceAccount?.name ?? "Environment"}</td><td className="px-4 py-3 text-gray-600">{job.status}</td><td className="px-4 py-3 text-gray-600">{job.createdAt.toLocaleString()}</td><td className="px-4 py-3 text-gray-600">{job._count.items}</td><td className="px-4 py-3 text-gray-600">{completed} completed / {failed} failed</td><td className="px-4 py-3"><Link href={`/export/jobs/${job.id}`} className="rounded-lg border border-gray-200 px-3 py-2 font-medium text-gray-700">Open</Link></td></tr>;
              }) : <tr><td colSpan={7} className="p-8 text-center text-gray-500">No export jobs yet.</td></tr>}</tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
