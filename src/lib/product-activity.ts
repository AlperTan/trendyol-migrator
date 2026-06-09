import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

export const PRODUCT_STATUSES = [
  "draft",
  "ready",
  "exported",
  "needs_review",
  "archived",
] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export function parseProductStatus(value: unknown): ProductStatus | null {
  return typeof value === "string" &&
    PRODUCT_STATUSES.includes(value as ProductStatus)
    ? (value as ProductStatus)
    : null;
}

export async function logProductActivity(input: {
  productId: string;
  type: string;
  message: string;
  metadata?: unknown;
}) {
  return db.productActivity.create({
    data: {
      productId: input.productId,
      type: input.type,
      message: input.message,
      metadataJson:
        input.metadata === undefined
          ? undefined
          : (input.metadata as Prisma.InputJsonValue),
    },
  });
}

export async function logManyProductActivities(
  productIds: string[],
  type: string,
  message: string,
  metadata?: unknown
) {
  if (!productIds.length) return;
  await db.productActivity.createMany({
    data: productIds.map((productId) => ({
      productId,
      type,
      message,
      metadataJson:
        metadata === undefined
          ? undefined
          : (metadata as Prisma.InputJsonValue),
    })),
  });
}
