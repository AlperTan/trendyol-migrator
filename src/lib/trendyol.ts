type TrendyolCredentials = {
  supplierId: string;
  apiKey: string;
  apiSecret: string;
};

type FetchProductsParams = TrendyolCredentials & {
  page?: number;
  size?: number;
  archived?: boolean;
  rejected?: boolean;
  blacklisted?: boolean;
  onSale?: boolean;
};

export type TrendyolLegacyDeliveryUpdateItem = {
  barcode: string;
  title: string;
  description: string;
  brandId: number;
  categoryId: number;
  productMainId: string;
  vatRate: number;
  deliveryDuration: number;
  cargoCompanyId?: number | null;
  shipmentAddressId?: number | null;
  returningAddressId?: number | null;
};

function getBaseUrl() {
  const stage = String(process.env.TRENDYOL_STAGE ?? "").toLowerCase() === "true";
  return stage ? "https://stageapigw.trendyol.com" : "https://apigw.trendyol.com";
}

function buildHeaders({
  supplierId,
  apiKey,
  apiSecret,
}: TrendyolCredentials): HeadersInit {
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  return {
    Authorization: `Basic ${auth}`,
    "User-Agent": `${supplierId} - SelfIntegration`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

async function parseJsonResponse(res: Response) {
  const text = await res.text();

  let data: any;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(
      `Trendyol JSON dönmedi.\nHTTP ${res.status}. İlk 500 karakter: ${text.slice(0, 500)}`
    );
  }

  if (!res.ok) {
    throw new Error(
      JSON.stringify(
        {
          httpStatus: res.status,
          message:
            data?.message ||
            data?.error ||
            data?.exception ||
            "Trendyol API hatası",
          response: data,
        },
        null,
        2
      )
    );
  }

  return data;
}

function getEnvCredentials(): TrendyolCredentials {
  const supplierId = process.env.TRENDYOL_SUPPLIER_ID;
  const apiKey = process.env.TRENDYOL_API_KEY;
  const apiSecret = process.env.TRENDYOL_API_SECRET;

  if (!supplierId || !apiKey || !apiSecret) {
    throw new Error(
      "TRENDYOL_SUPPLIER_ID, TRENDYOL_API_KEY ve TRENDYOL_API_SECRET tanımlı olmalı."
    );
  }

  return {
    supplierId,
    apiKey,
    apiSecret,
  };
}

function chunkArray<T>(items: T[], size: number): T[][];
function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}

export async function fetchProductsPage({
  supplierId,
  apiKey,
  apiSecret,
  page = 0,
  size = 100,
  archived,
  rejected,
  blacklisted,
  onSale,
}: FetchProductsParams) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });

  if (typeof archived === "boolean") {
    params.set("archived", String(archived));
  }

  if (typeof rejected === "boolean") {
    params.set("rejected", String(rejected));
  }

  if (typeof blacklisted === "boolean") {
    params.set("blacklisted", String(blacklisted));
  }

  if (typeof onSale === "boolean") {
    params.set("onSale", String(onSale));
  }

  const url = `${getBaseUrl()}/integration/product/sellers/${supplierId}/products?${params.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    headers: buildHeaders({ supplierId, apiKey, apiSecret }),
    cache: "no-store",
  });

  const data = await parseJsonResponse(res);

  console.log("TRENDYOL PAGE META", {
    page,
    size,
    archived,
    rejected,
    blacklisted,
    onSale,
    totalPages: data?.totalPages,
    totalElements: data?.totalElements,
    returned: Array.isArray(data?.content) ? data.content.length : 0,
  });

  return data;
}

export async function fetchAllProducts(
  args: TrendyolCredentials & {
    size?: number;
    archived?: boolean;
    rejected?: boolean;
    blacklisted?: boolean;
    onSale?: boolean;
  }
) {
  const allItems: any[] = [];
  let page = 0;
  let totalPages = 1;

  do {
    const data = await fetchProductsPage({
      ...args,
      page,
    });

    const items = Array.isArray(data?.content) ? data.content : [];
    allItems.push(...items);

    totalPages =
      typeof data?.totalPages === "number" && Number.isFinite(data.totalPages)
        ? data.totalPages
        : page + 1;

    page += 1;
  } while (page < totalPages);

  return allItems;
}

export async function fetchProductBaseInfoByBarcode(
  barcode: string,
  credentials?: TrendyolCredentials
) {
  if (!barcode?.trim()) {
    throw new Error("barcode zorunludur.");
  }

  const creds = credentials ?? getEnvCredentials();

  const url = `${getBaseUrl()}/integration/product/sellers/${creds.supplierId}/product/${encodeURIComponent(
    barcode.trim()
  )}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...buildHeaders(creds),
      ...(process.env.TRENDYOL_STOREFRONT_CODE
        ? { storeFrontCode: process.env.TRENDYOL_STOREFRONT_CODE }
        : {}),
    },
    cache: "no-store",
  });

  return parseJsonResponse(res);
}

export async function fetchCategoryIdsByBarcodes(
  barcodes: string[],
  credentials?: TrendyolCredentials
) {
  const cleanBarcodes = Array.from(
    new Set(barcodes.map((b) => b.trim()).filter(Boolean))
  );

  if (cleanBarcodes.length === 0) {
    return {
      barcodeCategories: {} as Record<string, { id: number; displayName?: string }>,
      notFound: [] as string[],
    };
  }

  const creds = credentials ?? getEnvCredentials();
  const chunks = chunkArray(cleanBarcodes, 250);

  const mergedBarcodeCategories: Record<
    string,
    { id: number; displayName?: string }
  > = {};
  const mergedNotFound = new Set<string>();

  for (const [index, chunk] of chunks.entries()) {
    const url = `${getBaseUrl()}/integration/ecgw/v1/${creds.supplierId}/lookup/product-categories/by-barcodes`;

    console.log("CATEGORY LOOKUP CHUNK", {
      chunkIndex: index + 1,
      chunkCount: chunks.length,
      size: chunk.length,
    });

    const res = await fetch(url, {
      method: "POST",
      headers: buildHeaders(creds),
      body: JSON.stringify({
        barcodes: chunk,
      }),
      cache: "no-store",
    });

    const data = await parseJsonResponse(res);

    const barcodeCategories = data?.barcodeCategories ?? {};
    const notFound = Array.isArray(data?.notFound) ? data.notFound : [];

    for (const [barcode, category] of Object.entries(barcodeCategories)) {
      mergedBarcodeCategories[barcode] = category as {
        id: number;
        displayName?: string;
      };
    }

    for (const barcode of notFound) {
      if (typeof barcode === "string" && barcode.trim()) {
        mergedNotFound.add(barcode);
      }
    }
  }

  return {
    barcodeCategories: mergedBarcodeCategories,
    notFound: Array.from(mergedNotFound),
  };
}

export async function updateDeliveryDurationsLegacy(
  items: TrendyolLegacyDeliveryUpdateItem[],
  credentials?: TrendyolCredentials
) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Güncellenecek ürün listesi boş olamaz.");
  }

  const creds = credentials ?? getEnvCredentials();

  for (const item of items) {
    if (!item.barcode?.trim()) {
      throw new Error("barcode zorunludur.");
    }
    if (!item.title?.trim()) {
      throw new Error(`title zorunlu: ${item.barcode}`);
    }
    if (!item.description?.trim()) {
      throw new Error(`description zorunlu: ${item.barcode}`);
    }
    if (!item.productMainId?.trim()) {
      throw new Error(`productMainId zorunlu: ${item.barcode}`);
    }
    if (!Number.isFinite(item.brandId)) {
      throw new Error(`brandId zorunlu: ${item.barcode}`);
    }
    if (!Number.isFinite(item.categoryId)) {
      throw new Error(`categoryId zorunlu: ${item.barcode}`);
    }
    if (!Number.isFinite(item.vatRate)) {
      throw new Error(`vatRate zorunlu: ${item.barcode}`);
    }
    if (!Number.isFinite(item.deliveryDuration) || item.deliveryDuration < 1) {
      throw new Error(`deliveryDuration geçersiz: ${item.barcode}`);
    }
  }

  const payload = {
    items: items.map((item) => ({
      barcode: item.barcode.trim(),
      title: item.title.trim(),
      description: item.description.trim(),
      brandId: item.brandId,
      categoryId: item.categoryId,
      productMainId: item.productMainId.trim(),
      vatRate: item.vatRate,
      deliveryDuration: Math.trunc(item.deliveryDuration),
      ...(item.cargoCompanyId ? { cargoCompanyId: item.cargoCompanyId } : {}),
      ...(item.shipmentAddressId ? { shipmentAddressId: item.shipmentAddressId } : {}),
      ...(item.returningAddressId ? { returningAddressId: item.returningAddressId } : {}),
    })),
  };

  const url = `${getBaseUrl()}/integration/product/sellers/${creds.supplierId}/products`;

  console.log("TRENDYOL LEGACY DELIVERY UPDATE REQUEST", {
    url,
    itemCount: payload.items.length,
    firstItem: payload.items[0],
  });

  const res = await fetch(url, {
    method: "PUT",
    headers: buildHeaders(creds),
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = await parseJsonResponse(res);

  return {
    ok: true,
    requestCount: items.length,
    batchRequestId: data?.batchRequestId ?? null,
    raw: data,
  };
}

export async function getBatchRequestResult(batchRequestId: string) {
  if (!batchRequestId) {
    throw new Error("batchRequestId zorunludur.");
  }

  const creds = getEnvCredentials();

  const url = `${getBaseUrl()}/integration/product/sellers/${creds.supplierId}/products/batch-requests/${batchRequestId}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...buildHeaders(creds),
      ...(process.env.TRENDYOL_STOREFRONT_CODE
        ? { storeFrontCode: process.env.TRENDYOL_STOREFRONT_CODE }
        : {}),
    },
    cache: "no-store",
  });

  return parseJsonResponse(res);
}