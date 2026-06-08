import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import RunShopifyExportButton from "./run-shopify-export-button";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ExportJobDetailPage({ params }: PageProps) {
  const { id } = await params;
  const job = await db.exportJob.findUnique({
    where: { id },
    include: {
      marketplaceAccount: {
        select: { id: true, name: true, marketplace: true, isActive: true },
      },
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          product: {
            select: {
              id: true,
              titleSource: true,
              titleEdited: true,
              sku: true,
              barcode: true,
            },
          },
        },
      },
    },
  });

  if (!job) notFound();

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link
          href="/"
          className="inline-flex rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700"
        >
          Back to products
        </Link>

        <section className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                Export Job
              </p>
              <h1 className="mt-1 text-2xl font-bold text-gray-900">{job.id}</h1>
              <p className="mt-2 text-sm text-gray-500">
                Marketplace: {job.targetMarketplace} · Status: {job.status} ·
                Account: {job.marketplaceAccount?.name ?? "Environment variables"}
              </p>
            </div>
            <RunShopifyExportButton
              jobId={job.id}
              disabled={job.targetMarketplace !== "shopify" || job.status === "running"}
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Shopify ID</th>
                  <th className="px-4 py-3 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {job.items.map((item) => (
                  <tr key={item.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link href={`/products/${item.product.id}`} className="hover:underline">
                        {item.product.titleEdited ?? item.product.titleSource}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.product.sku ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-600">{item.status}</td>
                    <td className="px-4 py-3 text-gray-600">{item.targetExternalId ?? "-"}</td>
                    <td className="max-w-md px-4 py-3 text-rose-700">{item.errorMessage ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
