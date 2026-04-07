"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useCart } from "@/app/context/cartContext";
import Link from "next/link";

export default function ProductDetail() {
  const params = useParams();
  const id = params?.id as string;
  const { dispatch } = useCart();
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  
  // အရေအတွက် (Quantity) ကို မှတ်သားမည့် State အသစ်
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (id) fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    const supabase = createClient();
    const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
    if (data) setProduct(data);
    setLoading(false);
  };

  // အတိုး/အလျှော့ ခလုတ်များအတွက် Functions
  const increaseQuantity = () => setQuantity(prev => prev + 1);
  const decreaseQuantity = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

  const handleAddToCart = () => {
    if (product) {
      // Cart ထဲသို့ Quantity ပါ တစ်ခါတည်း ပို့ပေးပါမည်
      dispatch({ type: "ADD_TO_CART", payload: { ...product, quantity: quantity } });
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-indigo-400 font-bold text-2xl animate-pulse">Loading Product...</div>;
  if (!product) return <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-white space-y-4"><h1 className="text-4xl font-bold text-red-500">404 - Product Not Found</h1><Link href="/products" className="text-indigo-400 underline">Go back to shop</Link></div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-32 pb-20 px-6 relative overflow-hidden">
      {/* Background Glow Effect */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        <Link href="/products" className="text-gray-400 hover:text-white mb-10 inline-block font-medium tracking-wide transition-colors">
          ← Back to Shop
        </Link>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          
          {/* ဘယ်ဘက် - Product ပုံ */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl shadow-indigo-500/10">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-black/40 border border-white/5">
              <img src={product.image} alt={product.name} className="object-cover w-full h-full transform hover:scale-105 transition-transform duration-700" />
            </div>
          </div>
          
          {/* ညာဘက် - Product အသေးစိတ်နှင့် Quantity */}
          <div className="space-y-8 pt-6">
            <div className="inline-block px-4 py-1.5 bg-indigo-500/20 text-indigo-400 text-sm font-bold rounded-full uppercase tracking-wider border border-indigo-500/30">
              {product.product_type || "Digital Asset"}
            </div>
            
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter leading-tight">{product.name}</h1>
            <p className="text-4xl font-black text-emerald-400">${product.price}</p>
            <p className="text-gray-300 text-lg leading-relaxed whitespace-pre-wrap">{product.description}</p>
            
            {/* Quantity Selector UI */}
            <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
              
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider font-bold mb-2">Quantity</label>
                <div className="flex items-center bg-black/50 border border-white/10 rounded-xl overflow-hidden w-fit">
                  <button onClick={decreaseQuantity} className="px-5 py-3 text-gray-400 hover:text-white hover:bg-white/10 transition-colors font-bold text-lg">
                    −
                  </button>
                  <span className="px-6 py-3 font-bold text-lg w-16 text-center border-x border-white/10">
                    {quantity}
                  </span>
                  <button onClick={increaseQuantity} className="px-5 py-3 text-gray-400 hover:text-white hover:bg-white/10 transition-colors font-bold text-lg">
                    +
                  </button>
                </div>
              </div>

              {/* Subtotal Calculation */}
              <div className="bg-white/5 px-6 py-3.5 rounded-xl border border-white/10">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Subtotal</p>
                <p className="text-xl font-bold text-emerald-400">
                  ${(product.price * quantity).toFixed(2)}
                </p>
              </div>

            </div>
            
            {/* Add to Cart Button */}
            <div className="pt-2">
              <button 
                onClick={handleAddToCart} 
                className={`w-full px-12 py-5 rounded-2xl font-extrabold text-lg transition-all shadow-2xl flex items-center justify-center gap-3 ${
                  added 
                  ? 'bg-emerald-500 text-white shadow-emerald-500/50' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/50'
                }`}
              >
                {added ? (
                  <><span>✓</span> Added {quantity} to Cart</>
                ) : (
                  <><span>🛒</span> Add to Cart</>
                )}
              </button>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}