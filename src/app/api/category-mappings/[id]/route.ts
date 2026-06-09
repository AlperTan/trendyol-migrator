import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { errorResponseMessage, optionalJson, optionalString, parseMarketplace, requiredString } from "@/lib/marketplace-api";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const marketplace = parseMarketplace(body.marketplace);
    const targetCategoryId = requiredString(body.targetCategoryId);
    const localCategoryId = optionalString(body.localCategoryId);
    const localCategoryName = optionalString(body.localCategoryName);
    if (!marketplace || !targetCategoryId || (!localCategoryId && !localCategoryName)) {
      return NextResponse.json({ error: "Marketplace, target category, and a local category are required" }, { status: 400 });
    }
    return NextResponse.json(await db.categoryMapping.update({
      where: { id },
      data: {
        marketplace, localCategoryId, localCategoryName, targetCategoryId,
        targetCategoryName: optionalString(body.targetCategoryName),
        ...("requiredAttributesJson" in body
          ? { requiredAttributesJson: optionalJson(body.requiredAttributesJson) }
          : {}),
      },
    }));
  } catch (error) {
    return NextResponse.json({ error: errorResponseMessage(error) }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    await db.categoryMapping.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json({ error: errorResponseMessage(error) }, { status: 500 });
  }
}
