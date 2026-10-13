"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { daysUntil } from "./format";

export type Renewal = { id: string; name: string; image?: string | null; daysLeft: number; orderId: string };

/** Subscriptions that expire within 7 days (or expired in the last 30), newest end date per product. */
export function findRenewals(orders: any[]): Renewal[] {
  const best = new Map<string, Renewal>();
  for (const o of orders) {
    if (o.status !== "completed") continue;
    for (const item of o.items || []) {
      if (!item?.end_date || !(Number(item.subscription_days) > 0)) continue;
      const left = daysUntil(item.end_date);
      if (left === null) continue;
      const id = String(item.id);
      const prev = best.get(id);
      // keep the latest subscription for this product
      if (!prev || left > prev.daysLeft) best.set(id, { id, name: item.name, image: item.image, daysLeft: left, orderId: String(o.id) });
    }
  }
  return Array.from(best.values())
    .filter((r) => r.daysLeft <= 7 && r.daysLeft > -30)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

/** Renewals for the signed-in customer (empty when signed out). */
export function useRenewals() {
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  useEffect(() => {
    const supabase = createClient();
    let alive = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: orders } = await supabase.from("orders").select("id, status, items").eq("status", "completed");
      if (alive) setRenewals(findRenewals(orders || []));
    });
    return () => {
      alive = false;
    };
  }, []);
  return renewals;
}
