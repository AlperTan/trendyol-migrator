import { Marketplace, Prisma } from "@prisma/client";

export function parseMarketplace(value: unknown): Marketplace | null {
  return typeof value === "string" &&
    Object.values(Marketplace).includes(value as Marketplace)
    ? (value as Marketplace)
    : null;
}

export function requiredString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function optionalString(value: unknown): string | null {
  return requiredString(value);
}

export function optionalJson(value: unknown): Prisma.InputJsonValue | undefined {
  return value == null ? undefined : (value as Prisma.InputJsonValue);
}

export function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function maskCredentials(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(() => "[REDACTED]");
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).map((key) => [key, "[REDACTED]"])
    );
  }

  return "[REDACTED]";
}

export function errorResponseMessage(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "A record with these values already exists";
    if (error.code === "P2003") return "A referenced record does not exist";
  }

  return error instanceof Error ? error.message : "Unexpected server error";
}
