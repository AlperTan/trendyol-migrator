import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();

    if (!Array.isArray(body?.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "items zorunlu" },
        { status: 400 }
      );
    }

    for (const item of body.items) {
      const productId =
        typeof item?.productId === "string" ? item.productId.trim() : "";
      const deliveryDuration = Number(item?.deliveryDuration);

      if (!productId) {
        return NextResponse.json(
          { error: "productId zorunlu" },
          { status: 400 }
        );
      }

      if (!Number.isFinite(deliveryDuration) || deliveryDuration < 1) {
        return NextResponse.json(
          { error: `Geçersiz deliveryDuration: ${productId}` },
          { status: 400 }
        );
      }
    }

    await Promise.all(
      body.items.map((item: { productId: string; deliveryDuration: number }) =>
        db.product.update({
          where: { id: item.productId },
          data: {
            deliveryDurationEdited: Math.trunc(item.deliveryDuration),
          },
        })
      )
    );

    return NextResponse.json({
      ok: true,
      updated: body.items.length,
    });
  } catch (error) {
    console.error("LOCAL DELIVERY DURATION PATCH ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Bilinmeyen sunucu hatası",
      },
      { status: 500 }
    );
  }
}