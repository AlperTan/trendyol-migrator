import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { errorResponseMessage, optionalJson, optionalString, parseMarketplace, requiredString } from "@/lib/marketplace-api";

export async function GET() {
  return NextResponse.json(await db.productTemplate.findMany({ orderBy: [{ marketplace: "asc" }, { name: "asc" }] }));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const marketplace = parseMarketplace(body.marketplace);
    const name = requiredString(body.name);
    if (!marketplace || !name) return NextResponse.json({ error: "Marketplace and name are required" }, { status: 400 });
    return NextResponse.json(await db.productTemplate.create({ data: {
      marketplace, name, categoryId: optionalString(body.categoryId), categoryName: optionalString(body.categoryName),
      defaultAttributes: optionalJson(body.defaultAttributes), defaultVatRate: number(body.defaultVatRate),
      defaultCargoCompanyId: integer(body.defaultCargoCompanyId), defaultDeliveryDuration: integer(body.defaultDeliveryDuration),
      defaultBrandId: integer(body.defaultBrandId),
    } }), { status: 201 });
  } catch (error) { return NextResponse.json({ error: errorResponseMessage(error) }, { status: 500 }); }
}

function number(value: unknown) { const parsed = Number(value); return value === "" || value == null || !Number.isFinite(parsed) ? null : parsed; }
function integer(value: unknown) { const parsed = number(value); return parsed == null ? null : Math.trunc(parsed); }
