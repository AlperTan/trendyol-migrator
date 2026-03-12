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
  };
}

async function parseJsonResponse(res: Response) {
  const text = await res.text();

  let data: any;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(
      `Trendyol JSON dönmedi. HTTP ${res.status}. İlk 300 karakter: ${text.slice(0, 300)}`
    );
  }

  if (!res.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        data?.exception ||
        `Trendyol API hatası. HTTP ${res.status}`
    );
  }

  return data;
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

  const url = `https://apigw.trendyol.com/integration/product/sellers/${supplierId}/products?${params.toString()}`;

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