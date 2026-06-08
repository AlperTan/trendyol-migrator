import { NextRequest, NextResponse } from "next/server";

import { buildNormalizedProduct } from "@/core/normalized-product";
import { ShopifyGraphqlError } from "@/integrations/shopify/client";
import {
  exportProductToShopify,
  shopifyAdapter,
} from "@/integrations/shopify/export";
import { db } from "@/lib/db";
import { errorResponseMessage, toInputJson } from "@/lib/marketplace-api";

type RouteContext = { params: Promise<{ id: string }> };

function responseWarnings(value: unknown): string[] {
  if (!value || typeof value !== "object" || !("warnings" in value)) return [];
  const warnings = (value as { warnings?: unknown }).warnings;
  return Array.isArray(warnings)
    ? warnings.filter((warning): warning is string => typeof warning === "string")
    : [];
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = await req.json().catch(() => ({}));
    const rerunCompleted = body?.rerunCompleted === true;
    const statuses = rerunCompleted
      ? (["pending", "failed", "completed"] as const)
      : (["pending", "failed"] as const);

    const job = await db.exportJob.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
          include: {
            product: { include: { images: { orderBy: { sortOrder: "asc" } } } },
          },
        },
      },
    });

    if (!job) return NextResponse.json({ error: "Export job not found" }, { status: 404 });
    if (job.targetMarketplace !== "shopify") {
      return NextResponse.json({ error: "Only Shopify export jobs can be run" }, { status: 400 });
    }

    const runnableItems = job.items.filter((item) => statuses.includes(item.status as never));
    const skippedByRunner = job.items.length - runnableItems.length;
    const runWarnings: string[] = [];

    await db.exportJob.update({ where: { id: job.id }, data: { status: "running" } });

    for (const item of runnableItems) {
      const normalizedProduct = buildNormalizedProduct(item.product);
      const validation = shopifyAdapter.validateProduct(normalizedProduct);
      const mappedPayload = shopifyAdapter.mapProduct(normalizedProduct);

      await db.exportJobItem.update({
        where: { id: item.id },
        data: {
          status: "running",
          errorMessage: null,
          requestPayload: toInputJson(mappedPayload),
          responsePayload: validation.warnings.length
            ? toInputJson({ validationWarnings: validation.warnings })
            : undefined,
        },
      });

      if (!validation.valid) {
        await db.exportJobItem.update({
          where: { id: item.id },
          data: {
            status: "failed",
            errorMessage: validation.errors.join("; "),
            responsePayload: toInputJson({
              validationErrors: validation.errors,
              validationWarnings: validation.warnings,
            }),
          },
        });
        runWarnings.push(...validation.warnings);
        continue;
      }

      try {
        const existingLinks = await db.marketplaceProduct.findMany({
          where: {
            productId: item.productId,
            marketplace: "shopify",
            marketplaceAccountId: job.marketplaceAccountId,
          },
          orderBy: { createdAt: "asc" },
        });
        const primaryLink = existingLinks[0] ?? null;
        const result = await exportProductToShopify(normalizedProduct, {
          externalProductId: primaryLink?.externalProductId,
        });
        const externalId = result.externalProductId ?? result.externalId;

        if (!result.success || !externalId) {
          throw new Error("Shopify export returned no external product ID");
        }

        runWarnings.push(...responseWarnings(result.responsePayload));
        await db.$transaction(async (tx) => {
          await tx.exportJobItem.update({
            where: { id: item.id },
            data: {
              status: "completed",
              targetExternalId: externalId,
              requestPayload: result.requestPayload
                ? toInputJson(result.requestPayload)
                : toInputJson(mappedPayload),
              responsePayload: result.responsePayload
                ? toInputJson(result.responsePayload)
                : undefined,
              errorMessage: null,
            },
          });

          const linkData = {
            externalProductId: externalId,
            externalSku: normalizedProduct.sku,
            status: "exported" as const,
            lastExportedAt: new Date(),
          };
          if (primaryLink) {
            await tx.marketplaceProduct.update({
              where: { id: primaryLink.id },
              data: linkData,
            });
            if (existingLinks.length > 1) {
              await tx.marketplaceProduct.deleteMany({
                where: { id: { in: existingLinks.slice(1).map((link) => link.id) } },
              });
            }
          } else {
            await tx.marketplaceProduct.create({
              data: {
                productId: item.productId,
                marketplace: "shopify",
                marketplaceAccountId: job.marketplaceAccountId,
                ...linkData,
              },
            });
          }
        });
      } catch (error) {
        await db.exportJobItem.update({
          where: { id: item.id },
          data: {
            status: "failed",
            errorMessage: errorResponseMessage(error),
            responsePayload:
              error instanceof ShopifyGraphqlError && error.responsePayload
                ? toInputJson(error.responsePayload)
                : undefined,
          },
        });
      }
    }

    const finalItems = await db.exportJobItem.findMany({
      where: { exportJobId: job.id },
      select: { status: true },
    });
    const completed = finalItems.filter((item) => item.status === "completed").length;
    const failed = finalItems.filter((item) => item.status === "failed").length;
    const unfinished = finalItems.filter((item) =>
      item.status === "pending" || item.status === "running"
    ).length;
    const finalStatus = failed > 0 || unfinished > 0 ? "failed" : "completed";

    const updatedJob = await db.exportJob.update({
      where: { id: job.id },
      data: { status: finalStatus },
    });

    return NextResponse.json({
      job: updatedJob,
      total: finalItems.length,
      completed,
      failed,
      skipped: skippedByRunner,
      warnings: Array.from(new Set(runWarnings)),
    });
  } catch (error) {
    console.error("RUN SHOPIFY EXPORT JOB ERROR:", error);
    await db.exportJob.update({ where: { id }, data: { status: "failed" } }).catch(() => undefined);
    return NextResponse.json({ error: errorResponseMessage(error) }, { status: 500 });
  }
}
