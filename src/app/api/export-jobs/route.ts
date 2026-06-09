import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { buildProductReadiness } from "@/lib/product-readiness";
import {
  errorResponseMessage,
  optionalString,
  parseMarketplace,
} from "@/lib/marketplace-api";
import { logManyProductActivities } from "@/lib/product-activity";

function parseProductIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const ids = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  return Array.from(new Set(ids));
}

export async function GET(req: NextRequest) {
  const requestedLimit = Number(req.nextUrl.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(100, Math.max(1, Math.trunc(requestedLimit)))
    : 50;

  const jobs = await db.exportJob.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      marketplaceAccount: {
        select: { id: true, name: true, marketplace: true, isActive: true },
      },
      _count: { select: { items: true } },
    },
  });

  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const targetMarketplace = parseMarketplace(body.targetMarketplace);
    const marketplaceAccountId = optionalString(body.marketplaceAccountId);
    const productIds = parseProductIds(body.productIds);

    if (!targetMarketplace || productIds.length === 0) {
      return NextResponse.json(
        { error: "targetMarketplace and at least one productId are required" },
        { status: 400 }
      );
    }

    if (marketplaceAccountId) {
      const account = await db.marketplaceAccount.findUnique({
        where: { id: marketplaceAccountId },
      });

      if (!account || account.marketplace !== targetMarketplace) {
        return NextResponse.json(
          { error: "Marketplace account does not match targetMarketplace" },
          { status: 400 }
        );
      }
    }

    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });
    const foundIds = new Set(products.map((product) => product.id));
    const missingProductIds = productIds.filter((id) => !foundIds.has(id));

    if (missingProductIds.length > 0) {
      return NextResponse.json(
        { error: "Some products do not exist", missingProductIds },
        { status: 400 }
      );
    }

    if (targetMarketplace === "shopify" || targetMarketplace === "trendyol") {
      const [categoryMappings, categories, brands] = await Promise.all([
        db.categoryMapping.findMany({ where: { marketplace: "trendyol" } }),
        db.marketplaceCategoryCache.findMany({ where: { marketplace: "trendyol" }, select: { externalId: true, name: true } }),
        db.marketplaceBrandCache.findMany({ where: { marketplace: "trendyol" }, select: { externalId: true, name: true } }),
      ]);
      const blockedProducts = products
        .map((product) => {
          const readiness = buildProductReadiness(product, categoryMappings, { categories, brands }).readiness[
            targetMarketplace
          ];
          return {
            productId: product.id,
            title: product.titleEdited ?? product.titleSource,
            errors: readiness.errors,
          };
        })
        .filter((product) => product.errors.length > 0);

      if (blockedProducts.length > 0) {
        return NextResponse.json(
          { error: "Some products are not ready for export", blockedProducts },
          { status: 400 }
        );
      }
    }

    const job = await db.exportJob.create({
      data: {
        targetMarketplace,
        marketplaceAccountId,
        items: {
          create: productIds.map((productId) => ({ productId })),
        },
      },
      include: {
        marketplaceAccount: {
          select: { id: true, name: true, marketplace: true, isActive: true },
        },
        _count: { select: { items: true } },
      },
    });
    await logManyProductActivities(
      productIds,
      "export_created",
      `${targetMarketplace} export job created`,
      { exportJobId: job.id, marketplace: targetMarketplace }
    );

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error("CREATE EXPORT JOB ERROR:", error);
    return NextResponse.json(
      { error: errorResponseMessage(error) },
      { status: 500 }
    );
  }
}
