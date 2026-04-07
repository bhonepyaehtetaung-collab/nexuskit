"use client";

import { createContext, useContext, useReducer, useEffect, ReactNode } from "react";

// --- Types ---
export type CartItem = {
  id: string;
  name: string;
  price: number | string;
  image: string;
  product_type?: string;
  required_fields?: string[];
  subscription_days?: number;
  quantity: number;
};

type CartState = CartItem[];

type Action =
  | { type: "ADD_TO_CART"; payload: any }
  | { type: "REMOVE_FROM_CART"; payload: string }
  | { type: "UPDATE_QUANTITY"; payload: { id: string; quantity: number } }
  | { type: "CLEAR_CART" }
  | { type: "INIT_CART"; payload: any };

// --- Context ---
const CartContext = createContext<{ cart: CartState; dispatch: React.Dispatch<CartAction> } | undefined>(undefined);

// --- Reducer (The Brain) ---
const cartReducer = (state: CartState, action: CartAction): CartState => {
  let newState: CartState;

  switch (action.type) {
    case "INIT_CART":
      // Page စပွင့်တဲ့အခါ LocalStorage ထဲက Data တွေကို ပြန်ထည့်ပေးပါမည်
      return action.payload;

    case "ADD_TO_CART":
      const existingItemIndex = state.findIndex(item => item.id === action.payload.id);
      // သေချာတိကျစေရန် Number ပြောင်းပြီးမှ ပေါင်းပါမည်
      const qtyToAdd = Number(action.quantity) || 1;

      if (existingItemIndex > -1) {
        // ပစ္စည်းရှိပြီးသားဖြစ်ပါက လက်ရှိအရေအတွက်ပေါ်တွင်သာ အတိအကျ ပေါင်းထည့်မည် (Fix for Quantity Bug)
        newState = [...state];
        const currentQty = Number(newState[existingItemIndex].quantity) || 0;
        newState[existingItemIndex] = {
          ...newState[existingItemIndex],
          quantity: currentQty + qtyToAdd
        };
      } else {
        // ပစ္စည်းအသစ်ဖြစ်ပါက Cart ထဲသို့ အသစ်ထည့်မည်
        newState = [...state, { ...action.payload, quantity: qtyToAdd }];
      }
      break;

    case "REMOVE_FROM_CART":
      newState = state.filter(item => item.id !== action.payload);
      break;

    case "UPDATE_QUANTITY":
      // Quantity ကို အတိအကျ ပြင်ဆင်သည့်အခါ (ဥပမာ - Cart မျက်နှာပြင်တွင် အတိုး/အလျှော့လုပ်လျှင်)
      newState = state.map(item =>
        item.id === action.payload.id
          ? { ...item, quantity: Math.max(1, Number(action.payload.quantity)) } // အနည်းဆုံး ၁ ခု ရှိရမည်
          : item
      );
      break;

    case "CLEAR_CART":
      // Checkout အောင်မြင်သွားလျှင် Cart ကို ရှင်းလင်းမည်
      newState = [];
      break;

    default:
      return state;
  }

  // --- LocalStorage Persistence ---
  // State ပြောင်းလဲသွားတိုင်း Browser ရဲ့ LocalStorage ထဲကို အလိုအလျောက် Save လုပ်ပေးပါမည်
  if (action.type !== "INIT_CART" && typeof window !== "undefined") {
    localStorage.setItem("nexuskit_cart", JSON.stringify(newState));
  }

  return newState;
};

// --- Provider ---
export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, dispatch] = useReducer(cartReducer, []);

  // Component Mount ဖြစ်သည့်အခါ LocalStorage ထဲတွင် မှတ်ထားသော Cart ရှိမရှိ စစ်ဆေးပြီး ဆွဲယူပါမည်
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("nexuskit_cart");
      if (savedCart) {
        dispatch({ type: "INIT_CART", payload: JSON.parse(savedCart) });
      }
    } catch (error) {
      console.error("Failed to parse cart from localStorage", error);
    }
  }, []);

  return (
    <CartContext.Provider value={{ cart, dispatch }}>
      {children}
    </CartContext.Provider>
  );
};

// --- Custom Hook ---
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};