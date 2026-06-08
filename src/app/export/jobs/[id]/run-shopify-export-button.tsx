"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function RunShopifyExportButton({
  jobId,
  disabled,
}: {
  jobId: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);

  async function runExport() {
    setRunning(true);
    try {
      const response = await fetch(`/api/export-jobs/${jobId}/run`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Shopify export failed");

      toast.success(
        `Shopify export finished: ${data.summary?.completed ?? 0} completed, ${data.summary?.failed ?? 0} failed`
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Shopify export failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <button
      type="button"
      onClick={runExport}
      disabled={disabled || running}
      className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      {running ? "Running Shopify Export..." : "Run Shopify Export"}
    </button>
  );
}
