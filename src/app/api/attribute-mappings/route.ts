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
  const mappings = await db.attributeMapping.findMany({
    orderBy: [{ marketplace: "asc" }, { localAttributeName: "asc" }],
  });
  return NextResponse.json(mappings);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const marketplace = parseMarketplace(body.marketplace);
    const localAttributeName = requiredString(body.localAttributeName);
    const targetAttributeName = requiredString(body.targetAttributeName);

    if (!marketplace || !localAttributeName || !targetAttributeName) {
      return NextResponse.json(
        {
          error:
            "marketplace, localAttributeName, and targetAttributeName are required",
        },
        { status: 400 }
      );
    }

    const mapping = await db.attributeMapping.create({
      data: {
        marketplace,
        localAttributeName,
        targetAttributeName,
        targetAttributeId: optionalString(body.targetAttributeId),
        valueMappingJson: optionalJson(body.valueMappingJson),
      },
    });

    return NextResponse.json(mapping, { status: 201 });
  } catch (error) {
    console.error("CREATE ATTRIBUTE MAPPING ERROR:", error);
    return NextResponse.json(
      { error: errorResponseMessage(error) },
      { status: 500 }
    );
  }
}
