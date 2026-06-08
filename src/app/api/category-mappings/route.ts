import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import {
  errorResponseMessage,
  optionalJson,
  optionalString,
  parseMarketplace,
  requiredString,
} from "@/lib/marketplace-api";

export async function GET() {
  const mappings = await db.categoryMapping.findMany({
    orderBy: [{ marketplace: "asc" }, { localCategoryName: "asc" }],
  });
  return NextResponse.json(mappings);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const marketplace = parseMarketplace(body.marketplace);
    const localCategoryId = optionalString(body.localCategoryId);
    const localCategoryName = optionalString(body.localCategoryName);
    const targetCategoryId = requiredString(body.targetCategoryId);

    if (!marketplace || !targetCategoryId) {
      return NextResponse.json(
        { error: "marketplace and targetCategoryId are required" },
        { status: 400 }
      );
    }

    if (!localCategoryId && !localCategoryName) {
      return NextResponse.json(
        { error: "localCategoryId or localCategoryName is required" },
        { status: 400 }
      );
    }

    const mapping = await db.categoryMapping.create({
      data: {
        marketplace,
        localCategoryId,
        localCategoryName,
        targetCategoryId,
        targetCategoryName: optionalString(body.targetCategoryName),
        requiredAttributesJson: optionalJson(body.requiredAttributesJson),
      },
    });

    return NextResponse.json(mapping, { status: 201 });
  } catch (error) {
    console.error("CREATE CATEGORY MAPPING ERROR:", error);
    return NextResponse.json(
      { error: errorResponseMessage(error) },
      { status: 500 }
    );
  }
}
