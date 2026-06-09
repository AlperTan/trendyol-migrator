import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { errorResponseMessage, optionalJson, optionalString, parseMarketplace, requiredString } from "@/lib/marketplace-api";
type Context = { params: Promise<{ id: string }> };
const number = (value: unknown) => { const parsed = Number(value); return value === "" || value == null || !Number.isFinite(parsed) ? null : parsed; };
const integer = (value: unknown) => { const parsed = number(value); return parsed == null ? null : Math.trunc(parsed); };

export async function PATCH(req: NextRequest, context: Context) {
  try {
    const { id } = await context.params; const body = await req.json(); const marketplace = parseMarketplace(body.marketplace); const name = requiredString(body.name);
    if (!marketplace || !name) return NextResponse.json({ error: "Marketplace and name are required" }, { status: 400 });
    return NextResponse.json(await db.productTemplate.update({ where: { id }, data: {
      marketplace, name, categoryId: optionalString(body.categoryId), categoryName: optionalString(body.categoryName),
      defaultAttributes: optionalJson(body.defaultAttributes), defaultVatRate: number(body.defaultVatRate),
      defaultCargoCompanyId: integer(body.defaultCargoCompanyId), defaultDeliveryDuration: integer(body.defaultDeliveryDuration), defaultBrandId: integer(body.defaultBrandId),
    } }));
  } catch (error) { return NextResponse.json({ error: errorResponseMessage(error) }, { status: 500 }); }
}
export async function DELETE(_: NextRequest, context: Context) {
  try { const { id } = await context.params; await db.productTemplate.delete({ where: { id } }); return NextResponse.json({ deleted: true }); }
  catch (error) { return NextResponse.json({ error: errorResponseMessage(error) }, { status: 500 }); }
}
