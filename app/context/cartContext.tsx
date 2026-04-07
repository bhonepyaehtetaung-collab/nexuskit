"use client";

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from "react";

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  product_type: string;
  subscription_days?: number;
};

type CartState = CartItem[];

type CartAction =
  | { type: "ADD_TO_CART"; payload: any }
  | { type: "REMOVE_FROM_CART"; payload: string }
  | { type: "UPDATE_QUANTITY"; payload: { id: string; quantity: number } }
  | { type: "CLEAR_CART" }
  | { type: "INIT_CART"; payload: CartState };

const CartContext = createContext<{ cart: CartState; dispatch: React.Dispatch<CartAction> } | undefined>(undefined);

const cartReducer = (state: CartState, action: CartAction): CartState => {
  let newState: CartState;

  switch (action.type) {
    case "INIT_CART":
      return action.payload;

    case "ADD_TO_CART":
      const existingItemIndex = state.findIndex(item => item.id === action.payload.id);
      const qtyToAdd = Number(action.payload.quantity) || 1;

      if (existingItemIndex > -1) {
        newState = state.map((item, index) =>
          index === existingItemIndex ? { ...item, quantity: item.quantity + qtyToAdd } : item
        );
      } else {
        newState = [...state, { ...action.payload, quantity: qtyToAdd }];
      }
      break;

    case "REMOVE_FROM_CART":
      newState = state.filter(item => item.id !== action.payload);
      break;

    case "UPDATE_QUANTITY":
      newState = state.map(item =>
        item.id === action.payload.id ? { ...item, quantity: Math.max(1, action.payload.quantity) } : item
      );
      break;

    case "CLEAR_CART":
      newState = [];
      break;

    default:
      return state;
  }

  if (typeof window !== "undefined") {
    localStorage.setItem("nexuskit_cart", JSON.stringify(newState));
  }
  return newState;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, dispatch] = useReducer(cartReducer, []);

  useEffect(() => {
    const savedCart = localStorage.getItem("nexuskit_cart");
    if (savedCart) {
      dispatch({ type: "INIT_CART", payload: JSON.parse(savedCart) });
    }
  }, []);

  return <CartContext.Provider value={{ cart, dispatch }}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};