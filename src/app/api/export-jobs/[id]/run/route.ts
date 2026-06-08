import { NextRequest, NextResponse } from "next/server";

import { buildNormalizedProduct } from "@/core/normalized-product";
import { shopifyAdapter } from "@/integrations/shopify/export";
import { ShopifyGraphqlError } from "@/integrations/shopify/client";
import { db } from "@/lib/db";
import { errorResponseMessage, toInputJson } from "@/lib/marketplace-api";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const job = await db.exportJob.findUnique({
      where: { id },
      include: {
        items: {
          where: { status: { in: ["pending", "failed"] } },
          orderBy: { createdAt: "asc" },
          include: {
            product: { include: { images: { orderBy: { sortOrder: "asc" } } } },
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Export job not found" }, { status: 404 });
    }
    if (job.targetMarketplace !== "shopify") {
      return NextResponse.json(
        { error: "Only Shopify export jobs can be run" },
        { status: 400 }
      );
    }

    await db.exportJob.update({
      where: { id: job.id },
      data: { status: "running" },
    });

    for (const item of job.items) {
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
        continue;
      }

      try {
        const result = await shopifyAdapter.exportProduct(normalizedProduct);
        const externalId = result.externalProductId ?? result.externalId;

        if (!result.success || !externalId) {
          throw new Error("Shopify export returned no external product ID");
        }

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

          const link = await tx.marketplaceProduct.findFirst({
            where: {
              productId: item.productId,
              marketplace: "shopify",
              marketplaceAccountId: job.marketplaceAccountId,
            },
          });
          const linkData = {
            externalProductId: externalId,
            externalSku: normalizedProduct.sku,
            status: "exported" as const,
            lastExportedAt: new Date(),
          };

          if (link) {
            await tx.marketplaceProduct.update({
              where: { id: link.id },
              data: linkData,
            });
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

    const statusCounts = await db.exportJobItem.groupBy({
      by: ["status"],
      where: { exportJobId: job.id },
      _count: { _all: true },
    });
    const summary = Object.fromEntries(
      statusCounts.map((entry) => [entry.status, entry._count._all])
    );
    const failed = summary.failed ?? 0;
    const unfinished = (summary.pending ?? 0) + (summary.running ?? 0);
    const finalStatus = failed > 0 || unfinished > 0 ? "failed" : "completed";

    const updatedJob = await db.exportJob.update({
      where: { id: job.id },
      data: { status: finalStatus },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            productId: true,
            status: true,
            targetExternalId: true,
            errorMessage: true,
          },
        },
      },
    });

    return NextResponse.json({ job: updatedJob, summary });
  } catch (error) {
    console.error("RUN SHOPIFY EXPORT JOB ERROR:", error);
    await db.exportJob
      .update({ where: { id }, data: { status: "failed" } })
      .catch(() => undefined);
    return NextResponse.json(
      { error: errorResponseMessage(error) },
      { status: 500 }
    );
  }
}
