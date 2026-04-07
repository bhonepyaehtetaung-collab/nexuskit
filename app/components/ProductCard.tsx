"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '../context/cartContext';

export default function ProductCard({ product }: { product: any }) {
  const { dispatch } = useCart();
  const [added, setAdded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); // ဤနေရာသည် အရေးကြီးပါသည်။ Link အတိုင်း ဝင်သွားခြင်းကို တားဆီးပေးပါသည်။
    dispatch({ type: "ADD_TO_CART", payload: product });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl overflow-hidden hover:bg-white/10 transition-all duration-300 group flex flex-col h-full shadow-lg relative">
      
      <Link href={`/products/${product.id}`} className="absolute inset-0 z-0"></Link>

      <div className="relative z-10 block aspect-[4/3] overflow-hidden bg-black/40 pointer-events-none">
        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute top-4 left-4 bg-indigo-500/20 px-3 py-1 rounded-full text-xs font-medium text-indigo-400">
          {product.product_type || "Asset"}
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1 relative z-10 pointer-events-none">
        <h3 className="text-xl font-bold mb-2 group-hover:text-indigo-400 transition-colors line-clamp-1">{product.name}</h3>
        <p className="text-gray-400 text-sm mb-6 line-clamp-2 flex-1">{product.description}</p>

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10 pointer-events-auto">
          <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
            ${product.price}
          </span>
          {/* Add to Cart ခလုတ်ကို z-index မြင့်ပေးထားပြီး အလုပ်လုပ်စေပါသည် */}
          <button onClick={handleAddToCart} className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all z-20 relative ${added ? "bg-emerald-500 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}>
            {added ? "Added ✓" : "Add to Cart"}
          </button>
        </div>
      </div>
      
    </div>
  );
}