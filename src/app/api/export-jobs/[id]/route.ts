import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const job = await db.exportJob.findUnique({
    where: { id },
    include: {
      marketplaceAccount: {
        select: { id: true, name: true, marketplace: true, isActive: true },
      },
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          product: {
            select: {
              id: true,
              titleSource: true,
              titleEdited: true,
              sku: true,
              barcode: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Export job not found" }, { status: 404 });
  }

  return NextResponse.json(job);
}
