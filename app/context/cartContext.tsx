"use client";

import { useT } from "@/lib/i18n";
import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState, ReactNode } from "react";

/**
 * Cart lives in the browser (localStorage). Prices stored here are only
 * for display — the server re-prices every order from the database.
 */
export type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string | null;
  product_type?: string | null;
  subscription_days?: number | null;
  required_fields?: string[] | null;
  /** Values the customer typed on the product page, e.g. { "Player ID": "123" } */
  fields?: Record<string, string>;
  /** "bundle" lines are priced by the database as a toolkit. */
  kind?: "bundle";
  bundle_id?: string;
};

type CartState = CartItem[];

type CartAction =
  | { type: "ADD_TO_CART"; payload: any }
  | { type: "REMOVE_FROM_CART"; payload: string }
  | { type: "UPDATE_QUANTITY"; payload: { id: string; quantity: number } }
  | { type: "SYNC_PRODUCTS"; payload: any[] }
  | { type: "CLEAR_CART" }
  | { type: "INIT_CART"; payload: CartState };

const STORAGE_KEY = "nexuskit_cart";
const MAX_QTY = 99;

const clampQty = (n: unknown) => Math.min(MAX_QTY, Math.max(1, Math.floor(Number(n)) || 1));

/** Keep only the fields the cart needs, in the right types. */
function cleanFields(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>).slice(0, 20)) {
    if (typeof v === "string" && v.trim()) out[k.slice(0, 100)] = v.trim().slice(0, 500);
  }
  return Object.keys(out).length ? out : undefined;
}

function toCartItem(raw: any, quantity?: number): CartItem | null {
  if (!raw || raw.id === undefined || raw.id === null) return null;
  return {
    id: String(raw.id),
    name: String(raw.name ?? "Product"),
    price: Number(raw.price) || 0,
    quantity: clampQty(quantity ?? raw.quantity ?? 1),
    image: typeof raw.image === "string" ? raw.image : null,
    product_type: typeof raw.product_type === "string" ? raw.product_type : null,
    subscription_days: Number(raw.subscription_days) || 0,
    required_fields: Array.isArray(raw.required_fields) ? raw.required_fields.map(String).slice(0, 20) : [],
    fields: cleanFields(raw.fields),
    ...(raw.kind === "bundle" && raw.bundle_id ? { kind: "bundle" as const, bundle_id: String(raw.bundle_id) } : {}),
  };
}

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case "INIT_CART":
      return action.payload;
    case "ADD_TO_CART": {
      const item = toCartItem(action.payload);
      if (!item) return state;
      const existing = state.find((i) => i.id === item.id);
      if (existing) {
        return state.map((i) =>
          i.id === item.id ? { ...i, quantity: clampQty(i.quantity + item.quantity), fields: item.fields ?? i.fields } : i,
        );
      }
      return [...state, item];
    }
    case "REMOVE_FROM_CART":
      return state.filter((i) => i.id !== action.payload);
    case "UPDATE_QUANTITY":
      return state.map((i) => (i.id === action.payload.id ? { ...i, quantity: clampQty(action.payload.quantity) } : i));
    case "SYNC_PRODUCTS": {
      // Replace names/prices with fresh data from the database and drop
      // products that no longer exist.
      const fresh = new Map(action.payload.map((p: any) => [String(p.id), p]));
      return state
        .filter((i) => i.kind === "bundle" || fresh.has(i.id))
        .map((i) => (i.kind === "bundle" ? i : (toCartItem({ ...fresh.get(i.id), quantity: i.quantity, fields: i.fields }) as CartItem)));
    }
    case "CLEAR_CART":
      return [];
    default:
      return state;
  }
};

type Toast = { id: number; message: string; tone?: "success" | "error" };

type CartContextValue = {
  cart: CartState;
  dispatch: React.Dispatch<CartAction>;
  itemCount: number;
  subtotal: number;
  addItem: (product: any, quantity?: number, fields?: Record<string, string>) => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  toast: Toast | null;
  showToast: (message: string, tone?: Toast["tone"]) => void;
  hydrated: boolean;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useT();
  const [cart, dispatch] = useReducer(cartReducer, []);
  const [hydrated, setHydrated] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved cart once.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(saved)) {
        const items = saved.map((i) => toCartItem(i)).filter(Boolean) as CartItem[];
        dispatch({ type: "INIT_CART", payload: items });
      }
    } catch {
      /* corrupted or blocked storage — start empty */
    }
    setHydrated(true);
  }, []);

  // Save on every change (after the first load).
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      /* storage full or blocked */
    }
  }, [cart, hydrated]);

  const showToast = useCallback((message: string, tone: Toast["tone"] = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, tone });
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const addItem = useCallback(
    (product: any, quantity = 1, fields?: Record<string, string>) => {
      dispatch({ type: "ADD_TO_CART", payload: { ...product, quantity, fields } });
      showToast(t("cart.added", { name: product?.name ?? "Item" }));
    },
    [showToast, t],
  );

  const itemCount = cart.reduce((n, i) => n + i.quantity, 0);
  const subtotal = cart.reduce((n, i) => n + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ cart, dispatch, itemCount, subtotal, addItem, drawerOpen, setDrawerOpen, toast, showToast, hydrated }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};
