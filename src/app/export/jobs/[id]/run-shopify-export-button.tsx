"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function RunShopifyExportButton({
  jobId,
  disabled,
  marketplace = "shopify",
}: {
  jobId: string;
  disabled: boolean;
  marketplace?: "shopify" | "trendyol";
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [rerunCompleted, setRerunCompleted] = useState(false);

  async function runExport() {
    setRunning(true);
    try {
      const response = await fetch(`/api/export-jobs/${jobId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rerunCompleted }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? `${marketplace} export failed`);

      toast.success(
        `${marketplace} export finished: ${data.completed ?? 0} completed, ${data.failed ?? 0} failed, ${data.skipped ?? 0} skipped`
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `${marketplace} export failed`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
        <input
          type="checkbox"
          checked={rerunCompleted}
          onChange={(event) => setRerunCompleted(event.target.checked)}
          disabled={disabled || running}
        />
        Rerun completed items
      </label>
      <button
        type="button"
        onClick={runExport}
        disabled={disabled || running}
        className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {running ? `Running ${marketplace} Export...` : `Run ${marketplace} Export`}
      </button>
    </div>
  );
}
