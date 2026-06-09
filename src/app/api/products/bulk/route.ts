import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { errorResponseMessage } from "@/lib/marketplace-api";
import { logManyProductActivities, parseProductStatus } from "@/lib/product-activity";

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const productIds = Array.isArray(body.productIds) ? body.productIds.filter((id: unknown): id is string => typeof id === "string") : [];
    if (!productIds.length) return NextResponse.json({ error: "Select at least one product" }, { status: 400 });
    let data: Record<string, unknown> = {};
    let message = "Bulk action applied";
    if (body.action === "template") {
      const template = await db.productTemplate.findUnique({ where: { id: String(body.value) } });
      if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });
      data = {
        categoryId: template.categoryId ? Number(template.categoryId) || null : undefined,
        categoryName: template.categoryName ?? undefined, attributesJson: template.defaultAttributes ?? undefined,
        vatRateEdited: template.defaultVatRate ?? undefined, cargoCompanyId: template.defaultCargoCompanyId ?? undefined,
        deliveryDurationEdited: template.defaultDeliveryDuration ?? undefined, brandId: template.defaultBrandId ?? undefined,
      };
      message = `Template applied: ${template.name}`;
    } else if (body.action === "category") { data = { categoryId: Number(body.value) || null }; message = "Category assigned"; }
    else if (body.action === "brand") { data = { brandId: Number(body.value) || null }; message = "Brand assigned"; }
    else if (body.action === "vat") data = { vatRateEdited: Number(body.value) };
    else if (body.action === "cargo") data = { cargoCompanyId: Number(body.value) || null };
    else if (body.action === "attributes") data = { attributesJson: body.value };
    else if (body.action === "status") {
      const status = parseProductStatus(body.value);
      if (!status) return NextResponse.json({ error: "Invalid product status" }, { status: 400 });
      data = { status };
      message = `Status changed to ${status}`;
    }
    else if (body.action === "price-stock") {
      const changes: unknown[] = Array.isArray(body.changes) ? body.changes : [];
      const valid: Array<{ productId: string; price: number | null; stock: number }> = changes.filter((item: unknown): item is { productId: string; price: number | null; stock: number } => {
        if (!item || typeof item !== "object") return false;
        const row = item as Record<string, unknown>;
        return typeof row.productId === "string" && Number.isFinite(Number(row.stock)) && Number(row.stock) >= 0 &&
          (row.price == null || (Number.isFinite(Number(row.price)) && Number(row.price) >= 0));
      });
      await db.$transaction(valid.map((item) => db.product.update({
        where: { id: item.productId },
        data: { salePriceEdited: item.price == null ? null : Number(item.price), stock: Math.trunc(Number(item.stock)) },
      })));
      await logManyProductActivities(valid.map((item) => item.productId), "bulk_action_applied", "Price and stock updated", { action: body.action });
      return NextResponse.json({ updated: valid.length });
    }
    else return NextResponse.json({ error: "Unknown bulk action" }, { status: 400 });
    await db.product.updateMany({ where: { id: { in: productIds } }, data });
    await logManyProductActivities(productIds, body.action === "template" ? "template_applied" : "bulk_action_applied", message, { action: body.action, value: body.value });
    return NextResponse.json({ updated: productIds.length });
  } catch (error) { return NextResponse.json({ error: errorResponseMessage(error) }, { status: 500 }); }
}
