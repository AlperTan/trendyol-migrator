"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RefreshButton() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        setRefreshing(true);
        router.refresh();
        setTimeout(() => setRefreshing(false), 500);
      }}
      disabled={refreshing}
      className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 disabled:opacity-50"
    >
      {refreshing ? "Refreshing..." : "Refresh"}
    </button>
  );
}
