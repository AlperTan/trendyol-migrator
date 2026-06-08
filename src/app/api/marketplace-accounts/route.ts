import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import {
  errorResponseMessage,
  maskCredentials,
  parseMarketplace,
  requiredString,
} from "@/lib/marketplace-api";

export async function GET() {
  const accounts = await db.marketplaceAccount.findMany({
    orderBy: [{ marketplace: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(
    accounts.map((account) => ({
      ...account,
      credentialsJson: maskCredentials(account.credentialsJson),
    }))
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const marketplace = parseMarketplace(body.marketplace);
    const name = requiredString(body.name);
    const credentialsJson = body.credentialsJson;

    if (!marketplace || !name) {
      return NextResponse.json(
        { error: "marketplace and name are required" },
        { status: 400 }
      );
    }

    if (
      !credentialsJson ||
      typeof credentialsJson !== "object" ||
      Array.isArray(credentialsJson)
    ) {
      return NextResponse.json(
        { error: "credentialsJson must be a JSON object" },
        { status: 400 }
      );
    }

    const account = await db.marketplaceAccount.create({
      data: {
        marketplace,
        name,
        credentialsJson: credentialsJson as Prisma.InputJsonObject,
        isActive: typeof body.isActive === "boolean" ? body.isActive : true,
      },
    });

    return NextResponse.json(
      { ...account, credentialsJson: maskCredentials(account.credentialsJson) },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE MARKETPLACE ACCOUNT ERROR:", error);
    return NextResponse.json(
      { error: errorResponseMessage(error) },
      { status: 500 }
    );
  }
}
