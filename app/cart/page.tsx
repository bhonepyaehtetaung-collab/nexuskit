"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/app/context/cartContext";
import { createClient } from "@/utils/supabase/client";

export default function CartPage() {
  const { cart, dispatch } = useCart();
  const [settings, setSettings] = useState<any>({});
  const supabase = createClient();

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from("site_settings").select("*").eq("id", 1).single();
      if (data) setSettings(data);
    };
    fetchSettings();
  }, []);

  const handleRemove = (id: string) => {
    dispatch({ type: "REMOVE_FROM_CART", payload: id });
  };

  // Quantity များကိုပါ ထည့်သွင်းတွက်ချက်ခြင်း
  const totalItems = cart.reduce((total, item) => total + (item.quantity || 1), 0);
  const cartTotal = cart.reduce((total, item) => total + (Number(item.price) * (item.quantity || 1)), 0);

  // --- EMPTY CART STATE (Mobile Optimized) ---
  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white pt-32 pb-16 px-4 flex flex-col items-center justify-center text-center">
        <div className="text-5xl sm:text-6xl mb-4 sm:mb-6 opacity-50">🛒</div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-300">
          {settings?.cart_title || "Shopping Cart"} is Empty
        </h2>
        <Link 
          href="/products" 
          className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3.5 sm:px-8 sm:py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-indigo-600/20 text-sm sm:text-base"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  // --- ACTIVE CART STATE ---
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-6 sm:mb-10 px-2">
          {settings?.cart_title || "Shopping Cart"}
        </h1>
        
        {/* Mobile: 1 column, Desktop: 3 columns (2 for items, 1 for summary) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          
          {/* --- CART ITEMS LIST --- */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            {cart.map((item, index) => (
              <div key={index} className="bg-white/5 border border-white/10 p-3 sm:p-4 rounded-[1.5rem] flex items-center gap-3 sm:gap-6 relative group transition-all hover:bg-white/10">
                {/* Product Image - Responsive Size */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-black/40 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={item.image || "https://placehold.co/400x400/1a1a1a/4f46e5?text=Asset"} alt={item.name} className="w-full h-full object-cover" />
                </div>
                
                {/* Product Info */}
                <div className="flex-1 min-w-0 py-1">
                  <h3 className="text-base sm:text-lg font-bold truncate pr-2">{item.name}</h3>
                  <p className="text-[10px] sm:text-xs text-indigo-400 mb-1.5 font-medium">{item.product_type || "Asset"}</p>
                  <div className="flex items-center gap-3 sm:gap-4 mt-1">
                    <p className="text-emerald-400 font-black text-sm sm:text-base">${item.price}</p>
                    <p className="text-[10px] sm:text-xs text-gray-300 bg-white/10 px-2 py-1 rounded-md font-mono">
                      Qty: {item.quantity || 1}
                    </p>
                  </div>
                </div>

                {/* Remove Button - Touch Friendly */}
                <button 
                  onClick={() => handleRemove(item.id)} 
                  className="text-red-400 bg-red-500/10 p-2.5 sm:p-3 rounded-xl hover:bg-red-500/20 hover:text-red-300 transition-colors active:scale-90 flex-shrink-0 mr-1 sm:mr-0"
                  aria-label="Remove item"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              </div>
            ))}
          </div>

          {/* --- ORDER SUMMARY --- */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 border border-white/10 p-5 sm:p-8 rounded-[2rem] sm:rounded-3xl lg:sticky lg:top-28 shadow-xl">
              <h2 className="text-lg sm:text-xl font-bold mb-5 sm:mb-6 text-gray-200">
                {settings?.cart_order_summary || "Order Summary"}
              </h2>
              
              <div className="flex justify-between items-center mb-4 sm:mb-6 text-sm sm:text-base text-gray-400">
                <span>Subtotal ({totalItems} items)</span>
                <span className="font-mono">${cartTotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center mb-6 sm:mb-8 pt-5 sm:pt-6 border-t border-white/10">
                <span className="text-xl sm:text-2xl font-bold">Total</span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                  ${cartTotal.toFixed(2)}
                </span>
              </div>

              {/* Checkout Button */}
              <Link 
                href="/checkout" 
                className="block w-full text-center bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 py-4 sm:py-4.5 rounded-xl font-black text-white shadow-lg shadow-indigo-600/20 transition-all active:scale-95 text-base sm:text-lg"
              >
                {settings?.cart_checkout_button || "Proceed to Checkout"}
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}