import type { ShopifyUserError } from "./types";

const SHOPIFY_API_VERSION = "2025-01";

type GraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

export class ShopifyGraphqlError extends Error {
  constructor(
    message: string,
    readonly responsePayload?: unknown
  ) {
    super(message);
    this.name = "ShopifyGraphqlError";
  }
}

function getShopifyConfig() {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN?.trim();
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim();

  if (!storeDomain) {
    throw new ShopifyGraphqlError("SHOPIFY_STORE_DOMAIN is missing");
  }
  if (!accessToken) {
    throw new ShopifyGraphqlError("SHOPIFY_ADMIN_ACCESS_TOKEN is missing");
  }

  return {
    endpoint: `https://${storeDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "")}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    accessToken,
  };
}

function findUserErrors(value: unknown): ShopifyUserError[] {
  if (!value || typeof value !== "object") return [];

  for (const child of Object.values(value)) {
    if (
      child &&
      typeof child === "object" &&
      "userErrors" in child &&
      Array.isArray(child.userErrors)
    ) {
      return child.userErrors as ShopifyUserError[];
    }
  }

  return [];
}

export async function shopifyGraphql<T>(
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const config = getShopifyConfig();
  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": config.accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = (await response.json().catch(() => null)) as
    | GraphqlResponse<T>
    | null;

  if (!response.ok) {
    throw new ShopifyGraphqlError(
      `Shopify HTTP error ${response.status}: ${response.statusText}`,
      payload
    );
  }
  if (!payload) {
    throw new ShopifyGraphqlError("Shopify returned an invalid JSON response");
  }
  if (payload.errors?.length) {
    throw new ShopifyGraphqlError(
      `Shopify GraphQL error: ${payload.errors.map((error) => error.message).join("; ")}`,
      payload
    );
  }
  if (!payload.data) {
    throw new ShopifyGraphqlError("Shopify response did not include data", payload);
  }

  const userErrors = findUserErrors(payload.data);
  if (userErrors.length) {
    throw new ShopifyGraphqlError(
      `Shopify user error: ${userErrors.map((error) => error.message).join("; ")}`,
      payload.data
    );
  }

  return payload.data;
}

export class ShopifyClient {
  graphql<T>(query: string, variables: Record<string, unknown>) {
    return shopifyGraphql<T>(query, variables);
  }
}
