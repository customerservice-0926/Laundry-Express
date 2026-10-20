"use client";

import * as React from "react";
import type { AdditionalItem } from "@/types";

export function useAdditionalItems(all: boolean = false) {
  const [items, setItems] = React.useState<AdditionalItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const fetchItems = React.useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/additional-items${all ? "?all=true" : ""}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load additional items.");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load additional items.");
    } finally {
      setIsLoading(false);
    }
  }, [all]);

  React.useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  return { items, isLoading, error, refetch: fetchItems, setItems };
}
