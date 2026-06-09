"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const actions = [
  ["trendyol-categories", "Trendyol Kategorilerini Eşitle"],
  ["trendyol-brands", "Trendyol Markalarını Eşitle"],
  ["trendyol-attributes", "Trendyol Özelliklerini Eşitle"],
  ["shopify-product-types", "Shopify Ürün Tiplerini Eşitle"],
] as const;

export default function SyncPanel() {
  const router = useRouter(); const [running, setRunning] = useState("");
  async function sync(action: string) {
    setRunning(action);
    try {
      const response = await fetch("/api/marketplace-data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const data = await response.json(); if (!response.ok) throw new Error(data?.error ?? "Eşitleme başarısız");
      toast.success(`Eşitleme tamamlandı: ${data.count ?? 0} kayıt`); router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Eşitleme başarısız"); }
    finally { setRunning(""); }
  }
  return <div className="flex flex-wrap gap-2">{actions.map(([action, label]) => <button key={action} disabled={Boolean(running)} onClick={() => void sync(action)} className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{running === action ? "Eşitleniyor..." : label}</button>)}</div>;
}
