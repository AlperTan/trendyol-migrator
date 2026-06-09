import { NextRequest, NextResponse } from "next/server";

import { buildNormalizedProduct } from "@/core/normalized-product";
import { ShopifyGraphqlError } from "@/integrations/shopify/client";
import {
  exportProductToShopify,
  shopifyAdapter,
} from "@/integrations/shopify/export";
import { TrendyolApiError } from "@/integrations/trendyol/client";
import {
  exportProductToTrendyol,
  trendyolAdapter,
} from "@/integrations/trendyol/export";
import { db } from "@/lib/db";
import { errorResponseMessage, toInputJson } from "@/lib/marketplace-api";
import { matchBrand, suggestTrendyolCategories } from "@/core/category-suggestions";

type RouteContext = { params: Promise<{ id: string }> };

function responseWarnings(value: unknown): string[] {
  if (!value || typeof value !== "object" || !("warnings" in value)) return [];
  const warnings = (value as { warnings?: unknown }).warnings;
  return Array.isArray(warnings)
    ? warnings.filter((warning): warning is string => typeof warning === "string")
    : [];
}

function requiredAttributes(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.entries(value);
  return [];
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
    if (job.targetMarketplace !== "shopify" && job.targetMarketplace !== "trendyol") {
      return NextResponse.json({ error: "Only Shopify and Trendyol export jobs can be run" }, { status: 400 });
    }
    const adapter =
      job.targetMarketplace === "shopify" ? shopifyAdapter : trendyolAdapter;

    const runnableItems = job.items.filter((item) => statuses.includes(item.status as never));
    const skippedByRunner = job.items.length - runnableItems.length;
    const runWarnings: string[] = [];

    await db.exportJob.update({ where: { id: job.id }, data: { status: "running" } });

    for (const item of runnableItems) {
      const normalizedProduct = buildNormalizedProduct(item.product);
      if (job.targetMarketplace === "trendyol") {
        const [categories, brands] = await Promise.all([
          db.marketplaceCategoryCache.findMany({ where: { marketplace: "trendyol" }, select: { externalId: true, name: true } }),
          db.marketplaceBrandCache.findMany({ where: { marketplace: "trendyol" }, select: { externalId: true, name: true } }),
        ]);
        const mapping = await db.categoryMapping.findFirst({
          where: {
            marketplace: "trendyol",
            OR: [
              ...(normalizedProduct.localCategoryId
                ? [{ localCategoryId: normalizedProduct.localCategoryId }]
                : []),
              ...(normalizedProduct.categoryName
                ? [{ localCategoryName: normalizedProduct.categoryName }]
                : []),
            ],
          },
          orderBy: { createdAt: "asc" },
        });
        const trendyolData = normalizedProduct.marketplaceData.trendyol;
        if (trendyolData && !trendyolData.brandId) {
          const brand = matchBrand(normalizedProduct.brand, brands);
          if (brand?.confidence === 1) trendyolData.brandId = Number(brand.externalId) || null;
        }
        if (trendyolData && !trendyolData.categoryId) {
          const category = suggestTrendyolCategories({ title: normalizedProduct.title, localCategoryName: normalizedProduct.categoryName }, categories, 1)[0];
          if (category?.confidence >= 0.75) trendyolData.categoryId = Number(category.externalId) || null;
        }
        if (mapping && trendyolData) {
          const mappedCategoryId = Number(mapping.targetCategoryId);
          if (!trendyolData.categoryId && Number.isInteger(mappedCategoryId)) {
            trendyolData.categoryId = mappedCategoryId;
          }
          trendyolData.requiredAttributes = requiredAttributes(
            mapping.requiredAttributesJson
          );
        }
      }
      const validation = adapter.validateProduct(normalizedProduct);
      const mappedPayload = adapter.mapProduct(normalizedProduct);

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
        await db.productActivity.create({
          data: {
            productId: item.productId,
            type: "export_failed",
            message: `${job.targetMarketplace} export failed validation`,
            metadataJson: toInputJson({ exportJobId: job.id, errors: validation.errors }),
          },
        });
        runWarnings.push(...validation.warnings);
        continue;
      }

      try {
        const existingLinks = await db.marketplaceProduct.findMany({
          where: {
            productId: item.productId,
            marketplace: job.targetMarketplace,
            marketplaceAccountId: job.marketplaceAccountId,
          },
          orderBy: { createdAt: "asc" },
        });
        const primaryLink = existingLinks[0] ?? null;
        const result =
          job.targetMarketplace === "shopify"
            ? await exportProductToShopify(normalizedProduct, {
                externalProductId: primaryLink?.externalProductId,
              })
            : await exportProductToTrendyol(normalizedProduct, {
                existingLink: Boolean(primaryLink),
              });
        const externalId = result.externalProductId ?? result.externalId;

        if (!result.success || !externalId) {
          throw new Error(`${job.targetMarketplace} export returned no external product ID`);
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
                marketplace: job.targetMarketplace,
                marketplaceAccountId: job.marketplaceAccountId,
                ...linkData,
              },
            });
          }
          await tx.product.update({
            where: { id: item.productId },
            data: { status: "exported" },
          });
          await tx.productActivity.createMany({
            data: [
              {
                productId: item.productId,
                type: "marketplace_link_updated",
                message: `${job.targetMarketplace} marketplace link updated`,
                metadataJson: toInputJson({ marketplace: job.targetMarketplace, externalId }),
              },
              {
                productId: item.productId,
                type: "export_succeeded",
                message: `${job.targetMarketplace} export succeeded`,
                metadataJson: toInputJson({ exportJobId: job.id, externalId }),
              },
            ],
          });
        });
      } catch (error) {
        await db.exportJobItem.update({
          where: { id: item.id },
          data: {
            status: "failed",
            errorMessage: errorResponseMessage(error),
            responsePayload:
              (error instanceof ShopifyGraphqlError ||
                error instanceof TrendyolApiError) &&
              error.responsePayload
                ? toInputJson(error.responsePayload)
                : undefined,
          },
        });
        await db.productActivity.create({
          data: {
            productId: item.productId,
            type: "export_failed",
            message: `${job.targetMarketplace} export failed`,
            metadataJson: toInputJson({ exportJobId: job.id, error: errorResponseMessage(error) }),
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
    console.error("RUN EXPORT JOB ERROR:", error);
    await db.exportJob.update({ where: { id }, data: { status: "failed" } }).catch(() => undefined);
    return NextResponse.json({ error: errorResponseMessage(error) }, { status: 500 });
  }
}
