import Link from "next/link";
import { notFound } from "next/navigation";

import { getShopifyAdminProductUrl } from "@/integrations/shopify/client";
import { db } from "@/lib/db";
import RefreshButton from "./refresh-button";
import RunShopifyExportButton from "./run-shopify-export-button";

type PageProps = { params: Promise<{ id: string }> };

function json(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function warnings(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const payload = value as { warnings?: unknown; validationWarnings?: unknown };
  return [payload.warnings, payload.validationWarnings]
    .flatMap((result) => (Array.isArray(result) ? result : []))
    .filter((item): item is string => typeof item === "string");
}

function action(value: unknown): string | null {
  if (!value || typeof value !== "object" || !("action" in value)) return null;
  const result = (value as { action?: unknown }).action;
  return typeof result === "string" ? result : null;
}

function batchRequestId(value: unknown): string | null {
  if (!value || typeof value !== "object" || !("batchRequestId" in value)) return null;
  const result = (value as { batchRequestId?: unknown }).batchRequestId;
  return typeof result === "string" ? result : null;
}

export default async function ExportJobDetailPage({ params }: PageProps) {
  const { id } = await params;
  const job = await db.exportJob.findUnique({
    where: { id },
    include: {
      marketplaceAccount: { select: { id: true, name: true, marketplace: true, isActive: true } },
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          product: {
            select: { id: true, titleSource: true, titleEdited: true, sku: true, barcode: true },
          },
        },
      },
    },
  });
  if (!job) notFound();

  const completed = job.items.filter((item) => item.status === "completed").length;
  const failed = job.items.filter((item) => item.status === "failed").length;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap gap-2">
          <Link href="/export/jobs" className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700">Export jobs</Link>
          <Link href="/export" className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700">New export</Link>
          <Link href="/" className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700">Products</Link>
        </div>
        <section className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Export Job</p>
              <h1 className="mt-1 break-all text-2xl font-bold text-gray-900">{job.id}</h1>
              <p className="mt-2 text-sm text-gray-500">Marketplace: {job.targetMarketplace} · Status: {job.status} · Account: {job.marketplaceAccount?.name ?? "Environment variables"}</p>
              <p className="mt-2 text-sm font-medium text-gray-700">{completed} completed · {failed} failed · {job.items.length} total</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <RefreshButton />
              {job.targetMarketplace === "shopify" || job.targetMarketplace === "trendyol" ? <RunShopifyExportButton jobId={job.id} disabled={job.status === "running"} marketplace={job.targetMarketplace} /> : null}
            </div>
          </div>
        </section>
        <section className="space-y-3">
          {job.items.map((item) => {
            const itemWarnings = warnings(item.responsePayload);
            const itemAction = action(item.responsePayload);
            const itemBatchRequestId = batchRequestId(item.responsePayload);
            const shopifyAdminUrl =
              job.targetMarketplace === "shopify" && item.targetExternalId
                ? getShopifyAdminProductUrl(item.targetExternalId)
                : null;

            return (
              <article key={item.id} className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <Link href={`/products/${item.product.id}`} className="font-semibold text-gray-900 hover:underline">{item.product.titleEdited ?? item.product.titleSource}</Link>
                    <p className="mt-1 text-sm text-gray-500">SKU: {item.product.sku ?? "-"} · External ID: {item.targetExternalId ?? "-"}</p>
                    {itemBatchRequestId ? <p className="mt-1 text-sm font-medium text-blue-700">Batch request ID: {itemBatchRequestId}</p> : null}
                    {shopifyAdminUrl ? <a href={shopifyAdminUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-medium text-blue-700 hover:underline">Open in Shopify Admin</a> : null}
                  </div>
                  <div className="flex gap-2">
                    {itemAction ? <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{itemAction}</span> : null}
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">{item.status}</span>
                  </div>
                </div>
                {item.errorMessage ? <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{item.errorMessage}</p> : null}
                {itemWarnings.length ? <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{itemWarnings.map((warning) => <div key={warning}>Warning: {warning}</div>)}</div> : null}
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <details className="rounded-xl border border-gray-200 p-3"><summary className="cursor-pointer text-sm font-semibold text-gray-700">Request payload</summary><pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-all text-xs text-gray-600">{item.requestPayload ? json(item.requestPayload) : "No request payload"}</pre></details>
                  <details className="rounded-xl border border-gray-200 p-3"><summary className="cursor-pointer text-sm font-semibold text-gray-700">Response payload</summary><pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-all text-xs text-gray-600">{item.responsePayload ? json(item.responsePayload) : "No response payload"}</pre></details>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
