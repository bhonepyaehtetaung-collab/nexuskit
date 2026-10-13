"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { daysUntil } from "@/lib/format";
import { bustStoreCache } from "./ui";

export type Role = "super_admin" | "manager" | "editor";

/** Everything the admin panel shows, loaded once and refreshed per table. */
export function useAdminData(onRealtime?: (kind: "insert" | "slip", order: any) => void) {
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [methods, setMethods] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [team, setTeam] = useState<any[]>([]);
  const [pendingJobs, setPendingJobs] = useState(0);
  const [aiPending, setAiPending] = useState(0);
  const loadedRef = useRef(false);
  const realtimeRef = useRef(onRealtime);
  realtimeRef.current = onRealtime;

  const list = useCallback(
    async (table: string, order = "created_at") => {
      const { data } = await supabase.from(table).select("*").order(order, { ascending: false });
      return data || [];
    },
    [supabase],
  );

  const reload = useMemo(
    () => ({
      orders: async () => setOrders(await list("orders")),
      products: async () => {
        if (loadedRef.current) bustStoreCache();
        setProducts(await list("products"));
      },
      promos: async () => setPromos(await list("promo_codes")),
      methods: async () => {
        if (loadedRef.current) bustStoreCache();
        setMethods(await list("payment_methods"));
      },
      categories: async () => {
        if (loadedRef.current) bustStoreCache();
        setCategories((await list("product_categories")).reverse());
      },
      fields: async () => setFields((await list("customer_info_fields")).reverse()),
      settings: async () => {
        if (loadedRef.current) bustStoreCache();
        const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
        setSettings(data || {});
      },
      team: async () => setTeam(await list("team_members")),
      jobs: async () => {
        const { count, error } = await supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "pending");
        setPendingJobs(error ? 0 : count || 0);
      },
      ai: async () => {
        const { count, error } = await supabase.from("ai_drafts").select("id", { count: "exact", head: true }).eq("status", "pending");
        setAiPending(error ? 0 : count || 0);
      },
    }),
    [list, supabase],
  );

  const reloadAll = useCallback(async () => {
    const result = await Promise.allSettled(Object.values(reload).map((fn) => fn()));
    loadedRef.current = true;
    return result;
  }, [reload]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (p: any) => {
        realtimeRef.current?.("insert", p.new);
        reload.orders();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (p: any) => {
        if (p.new?.status === "pending" && p.old?.status === "awaiting_payment") realtimeRef.current?.("slip", p.new);
        reload.orders();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, reload]);

  return { supabase, orders, products, promos, methods, categories, fields, settings, setSettings, team, pendingJobs, aiPending, reload, reloadAll };
}

export type AdminData = ReturnType<typeof useAdminData>;

/* ------------------------------------------------------------------ */
/* Order helpers                                                       */
/* ------------------------------------------------------------------ */

export const isPayLater = (o: any) => o.payment_method === "pay_later" || String(o.slip_url || "").includes("placehold");
export const hasSlip = (o: any) => !!o.slip_url && !String(o.slip_url).includes("placehold");

/** What the admin needs to do next with an order. */
export function orderStage(o: any): "verify" | "setup" | "awaiting" | "completed" | "cancelled" {
  if (o.status === "completed") return "completed";
  if (o.status === "cancelled") return "cancelled";
  if (o.status === "awaiting_payment") return "awaiting";
  return isPayLater(o) && !hasSlip(o) ? "setup" : "verify";
}

/** "Name: Ko Ko | Player ID: 123" → [{label, value}] */
export function parseNote(note: string | null | undefined): { label: string; value: string }[] {
  return String(note || "")
    .split(" | ")
    .map((part) => {
      const i = part.indexOf(": ");
      return i > 0 ? { label: part.slice(0, i), value: part.slice(i + 2) } : { label: "", value: part };
    })
    .filter((x) => x.value.trim());
}

/** Subscription items in completed orders that end within `days`. */
export function expiringItems(orders: any[], days = 7) {
  const out: { order: any; item: any; left: number }[] = [];
  for (const o of orders) {
    if (o.status !== "completed") continue;
    for (const item of o.items || []) {
      const left = daysUntil(item?.end_date);
      if (left !== null && left <= days && left > -3) out.push({ order: o, item, left });
    }
  }
  return out.sort((a, b) => a.left - b.left);
}

export const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
