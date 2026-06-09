import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { buildProductReadiness } from "@/lib/product-readiness";
import { logProductActivity, parseProductStatus } from "@/lib/product-activity";

const ALLOWED_STATUSES = ["approved", "archived", "blacklisted", "unknown", "local"];

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nullableNumber(value: unknown): number | null {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSearch(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("I", "i")
    .replaceAll("İ", "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function matchesSearch(product: {
  titleSource: string;
  titleEdited: string | null;
  sku: string | null;
  barcode: string | null;
}, search: string) {
  if (!search) return true;

  const haystacks = [
    product.titleSource,
    product.titleEdited ?? "",
    product.sku ?? "",
    product.barcode ?? "",
  ].map(normalizeSearch);

  return haystacks.some((value) => value.includes(search));
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  const page = Math.max(Number(searchParams.get("page") ?? "1"), 1);
  const pageSizeRaw = Number(searchParams.get("pageSize") ?? "20");
  const pageSize = [20, 50, 100].includes(pageSizeRaw) ? pageSizeRaw : 20;

  const statusParam = searchParams.get("status") ?? "approved,local";
  const selectedStatuses = statusParam
    .split(",")
    .map((s) => s.trim())
    .filter((s) => ALLOWED_STATUSES.includes(s));

  const rawSearch = (searchParams.get("search") ?? "").trim();
  const normalizedSearch = normalizeSearch(rawSearch);

  const brand = (searchParams.get("brand") ?? "").trim();
  const category = (searchParams.get("category") ?? "").trim();

  const baseWhere: Prisma.ProductWhereInput = {};

  if (selectedStatuses.length > 0) {
    const sourceStatuses = selectedStatuses.filter((status) => status !== "local");
    baseWhere.OR = [];

    if (sourceStatuses.length > 0) {
      baseWhere.OR.push({ sourceStatus: { in: sourceStatuses } });
    }

    if (selectedStatuses.includes("local")) {
      baseWhere.OR.push({ sourcePlatform: null });
    }
  }

  if (brand) {
    baseWhere.brand = {
      equals: brand,
    };
  }

  if (category) {
    baseWhere.categorySource = {
      equals: category,
    };
  }

  const allMatchingBase = await db.product.findMany({
    where: baseWhere,
    orderBy: {
      titleSource: "asc",
    },
    include: {
      images: {
        where: {
          isSelected: true,
        },
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
  });

  const filtered = allMatchingBase.filter((product) =>
    matchesSearch(product, normalizedSearch)
  );

  const total = filtered.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);
  const [categoryMappings, cachedCategories, cachedBrands] = await Promise.all([
    db.categoryMapping.findMany({ where: { marketplace: "trendyol" } }),
    db.marketplaceCategoryCache.findMany({ where: { marketplace: "trendyol" }, select: { externalId: true, name: true } }),
    db.marketplaceBrandCache.findMany({ where: { marketplace: "trendyol" }, select: { externalId: true, name: true } }),
  ]);
  const items = pageItems.map((product) => ({
    ...product,
    readiness: buildProductReadiness(product, categoryMappings, { categories: cachedCategories, brands: cachedBrands }).readiness,
  }));

  console.log(
  "PRODUCTS API SAMPLE",
  items.slice(0, 5).map((item) => ({
    id: item.id,
    title: item.titleEdited ?? item.titleSource,
    contentId: item.contentId,
    barcode: item.barcode,
    deliveryDurationSource: item.deliveryDurationSource,
    deliveryDurationEdited: item.deliveryDurationEdited,
  }))
);

  const [brands, categories] = await Promise.all([
    db.product.findMany({
      where: {
        brand: {
          not: null,
        },
      },
      select: {
        brand: true,
      },
      distinct: ["brand"],
      orderBy: {
        brand: "asc",
      },
    }),
    db.product.findMany({
      where: {
        categorySource: {
          not: null,
        },
      },
      select: {
        categorySource: true,
      },
      distinct: ["categorySource"],
      orderBy: {
        categorySource: "asc",
      },
    }),
  ]);

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    totalPages,
    selectedStatuses,
    filters: {
      search: rawSearch,
      brand,
      category,
    },
    options: {
      brands: brands
        .map((item) => item.brand)
        .filter((value): value is string => Boolean(value)),
      categories: categories
        .map((item) => item.categorySource)
        .filter((value): value is string => Boolean(value)),
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = nullableString(body.title);

    if (!title) {
      return NextResponse.json({ error: "Ürün adı zorunludur" }, { status: 400 });
    }

    const stock = Math.trunc(nullableNumber(body.stock) ?? 0);

    if (stock < 0) {
      return NextResponse.json({ error: "Stok negatif olamaz" }, { status: 400 });
    }

    const product = await db.product.create({
      data: {
        sourcePlatform: null,
        sourceProductId: null,
        sourceStatus: null,
        titleSource: title,
        titleEdited: title,
        descriptionEdited: nullableString(body.description),
        salePriceEdited: nullableNumber(body.price),
        stock,
        currency: nullableString(body.currency) ?? "TRY",
        vatRateEdited: nullableNumber(body.vatRate),
        brand: nullableString(body.brand),
        sku: nullableString(body.sku),
        barcode: nullableString(body.barcode),
        categoryName: nullableString(body.categoryName),
        localCategoryId: nullableString(body.localCategoryId),
        status: parseProductStatus(body.status) ?? "draft",
      },
    });
    await logProductActivity({
      productId: product.id,
      type: "product_created",
      message: "Product created",
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("CREATE PRODUCT ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ürün oluşturulamadı" },
      { status: 500 }
    );
  }
}
