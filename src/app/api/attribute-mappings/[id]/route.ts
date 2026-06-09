import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { errorResponseMessage, optionalJson, optionalString, parseMarketplace, requiredString } from "@/lib/marketplace-api";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const marketplace = parseMarketplace(body.marketplace);
    const localAttributeName = requiredString(body.localAttributeName);
    const targetAttributeName = requiredString(body.targetAttributeName);
    if (!marketplace || !localAttributeName || !targetAttributeName) {
      return NextResponse.json({ error: "Marketplace and attribute names are required" }, { status: 400 });
    }
    return NextResponse.json(await db.attributeMapping.update({
      where: { id },
      data: {
        marketplace, localAttributeName, targetAttributeName,
        targetAttributeId: optionalString(body.targetAttributeId),
        ...("valueMappingJson" in body
          ? { valueMappingJson: optionalJson(body.valueMappingJson) }
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
    await db.attributeMapping.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json({ error: errorResponseMessage(error) }, { status: 500 });
  }
}
