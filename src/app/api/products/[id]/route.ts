import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const product = await db.product.findUnique({
    where: { id },
    include: {
      images: {
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
  });

  if (!product) {
    return NextResponse.json(
      { error: "Ürün bulunamadı" },
      { status: 404 }
    );
  }

  return NextResponse.json(product);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await req.json();

  const updated = await db.product.update({
    where: { id },
    data: {
      titleEdited: body.titleEdited ?? null,
      descriptionEdited: body.descriptionEdited ?? null,
      salePriceEdited:
        body.salePriceEdited === "" || body.salePriceEdited == null
          ? null
          : Number(body.salePriceEdited),
      brand: body.brand ?? null,
      sku: body.sku ?? null,
      status: body.status ?? "draft",
    },
  });

  return NextResponse.json(updated);
}