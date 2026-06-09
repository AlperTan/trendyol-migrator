import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (typeof body.pairKey !== "string" || !body.pairKey.includes(":")) return NextResponse.json({ error: "Invalid pair key" }, { status: 400 });
  const exclusion = await db.duplicateExclusion.upsert({ where: { pairKey: body.pairKey }, update: {}, create: { pairKey: body.pairKey } });
  return NextResponse.json(exclusion, { status: 201 });
}
