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

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white pt-40 pb-20 flex flex-col items-center justify-center">
        <div className="text-6xl mb-6">🛒</div>
        <h2 className="text-3xl font-bold mb-6">{settings?.cart_title || "Shopping Cart"} is Empty</h2>
        <Link href="/products" className="bg-indigo-600 hover:bg-indigo-700 px-8 py-3 rounded-xl font-bold transition-colors">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-32 pb-20 px-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-extrabold mb-10">{settings?.cart_title || "Shopping Cart"}</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item, index) => (
              <div key={index} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-6 relative group">
                <div className="w-24 h-24 bg-black/40 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold">{item.name}</h3>
                  <p className="text-xs text-gray-400 mb-2">{item.product_type}</p>
                  <div className="flex items-center gap-4">
                    <p className="text-emerald-400 font-bold">${item.price}</p>
                    <p className="text-xs text-gray-400 bg-white/10 px-2 py-1 rounded">Qty: {item.quantity || 1}</p>
                  </div>
                </div>
                <button onClick={() => handleRemove(item.id)} className="text-red-500 bg-red-500/10 p-3 rounded-xl hover:bg-red-500/20 transition-colors">
                  🗑️
                </button>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl sticky top-28">
              <h2 className="text-xl font-bold mb-6">{settings?.cart_order_summary || "Order Summary"}</h2>
              
              <div className="flex justify-between items-center mb-6 text-gray-400">
                <span>Subtotal ({totalItems} items)</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center mb-8 pt-6 border-t border-white/10">
                <span className="text-2xl font-bold">Total</span>
                <span className="text-2xl font-black text-emerald-400">${cartTotal.toFixed(2)}</span>
              </div>

              <Link href="/checkout" className="block w-full text-center bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 py-4 rounded-xl font-bold text-white shadow-lg transition-all">
                {settings?.cart_checkout_button || "Proceed to Checkout"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}