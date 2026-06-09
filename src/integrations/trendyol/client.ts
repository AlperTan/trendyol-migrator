import type {
  TrendyolBatchResponse,
  TrendyolPriceStockItem,
  TrendyolProductPayload,
} from "./types";

type Method = "GET" | "POST" | "PUT";

function credentials() {
  const supplierId = process.env.TRENDYOL_SUPPLIER_ID?.trim();
  const apiKey = process.env.TRENDYOL_API_KEY?.trim();
  const apiSecret = process.env.TRENDYOL_API_SECRET?.trim();
  if (!supplierId || !apiKey || !apiSecret) {
    throw new Error(
      "Missing Trendyol credentials: TRENDYOL_SUPPLIER_ID, TRENDYOL_API_KEY, and TRENDYOL_API_SECRET are required"
    );
  }
  return { supplierId, apiKey, apiSecret };
}

function baseUrl() {
  return String(process.env.TRENDYOL_STAGE ?? "").toLowerCase() === "true"
    ? "https://stageapigw.trendyol.com"
    : "https://apigw.trendyol.com";
}

export class TrendyolApiError extends Error {
  constructor(message: string, readonly responsePayload?: unknown) {
    super(message);
    this.name = "TrendyolApiError";
  }
}

function responseMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  for (const key of ["message", "error", "exception"]) {
    const value = (payload as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export async function trendyolRequest<T>(
  method: Method,
  path: string,
  body?: unknown
): Promise<T> {
  const { supplierId, apiKey, apiSecret } = credentials();
  const response = await fetch(`${baseUrl()}${path.replace("{supplierId}", supplierId)}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`,
      "User-Agent": `${supplierId} - SelfIntegration`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(process.env.TRENDYOL_STOREFRONT_CODE
        ? { storeFrontCode: process.env.TRENDYOL_STOREFRONT_CODE }
        : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text.slice(0, 1000) };
  }
  if (!response.ok) {
    throw new TrendyolApiError(
      responseMessage(payload) ??
        `Trendyol API request failed with HTTP ${response.status}`,
      payload
    );
  }
  return payload as T;
}

export function createOrUpdateProducts(
  items: TrendyolProductPayload[],
  operation: "create" | "update" = "create"
) {
  return trendyolRequest<TrendyolBatchResponse>(
    operation === "update" ? "PUT" : "POST",
    "/integration/product/sellers/{supplierId}/products",
    { items }
  );
}

export function updatePriceAndStock(items: TrendyolPriceStockItem[]) {
  return trendyolRequest<TrendyolBatchResponse>(
    "POST",
    "/integration/inventory/sellers/{supplierId}/products/price-and-inventory",
    { items }
  );
}

export function getBatchRequestResult(batchRequestId: string) {
  if (!batchRequestId.trim()) throw new Error("batchRequestId is required");
  return trendyolRequest<unknown>(
    "GET",
    `/integration/product/sellers/{supplierId}/products/batch-requests/${encodeURIComponent(batchRequestId)}`
  );
}

export class TrendyolClient {
  request = trendyolRequest;
  createOrUpdateProducts = createOrUpdateProducts;
  updatePriceAndStock = updatePriceAndStock;
  getBatchRequestResult = getBatchRequestResult;
}
