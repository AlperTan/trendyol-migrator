import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const ALLOWED_STATUSES = ["approved", "archived", "blacklisted", "unknown"];

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

  const statusParam = searchParams.get("status") ?? "approved";
  const selectedStatuses = statusParam
    .split(",")
    .map((s) => s.trim())
    .filter((s) => ALLOWED_STATUSES.includes(s));

  const rawSearch = (searchParams.get("search") ?? "").trim();
  const normalizedSearch = normalizeSearch(rawSearch);

  const brand = (searchParams.get("brand") ?? "").trim();
  const category = (searchParams.get("category") ?? "").trim();

  const baseWhere: any = {};

  if (selectedStatuses.length > 0) {
    baseWhere.sourceStatus = {
      in: selectedStatuses,
    };
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
        take: 1,
      },
    },
  });

  const filtered = allMatchingBase.filter((product) =>
    matchesSearch(product, normalizedSearch)
  );

  const total = filtered.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  const items = filtered.slice((page - 1) * pageSize, page * pageSize);

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