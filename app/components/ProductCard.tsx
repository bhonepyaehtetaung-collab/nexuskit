"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '../context/cartContext';

export default function ProductCard({ product }: { product: any }) {
  const { dispatch } = useCart();
  const [added, setAdded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); 
    dispatch({ type: "ADD_TO_CART", payload: product });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    // active:scale-[0.98] က ဖုန်းနဲ့နှိပ်လိုက်ရင် အိသွားတဲ့ ခံစားမှုပေးပါတယ်
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-[1.5rem] sm:rounded-3xl overflow-hidden hover:bg-white/10 transition-all duration-300 group flex flex-col h-full shadow-lg relative active:scale-[0.98] sm:active:scale-100">
      
      {/* Clickable Area for the whole card */}
      <Link href={`/products/${product.id}`} className="absolute inset-0 z-0"></Link>

      {/* Image Container - Responsive aspect ratio */}
      <div className="relative z-10 block aspect-[16/10] sm:aspect-[4/3] overflow-hidden bg-black/40 pointer-events-none">
        <img 
          src={product.image || "https://placehold.co/600x400/1a1a1a/4f46e5?text=NexusKit+Asset"} 
          alt={product.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
        />
        {/* Responsive Badge */}
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-indigo-500/20 px-2.5 py-1 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium text-indigo-400 backdrop-blur-sm">
          {product.product_type || "Premium Asset"}
        </div>
      </div>

      {/* Content Container - Responsive padding */}
      <div className="p-4 sm:p-6 flex flex-col flex-1 relative z-10 pointer-events-none">
        {/* Responsive Title */}
        <h3 className="text-lg sm:text-xl font-bold mb-1.5 sm:mb-2 group-hover:text-indigo-400 transition-colors line-clamp-1">
          {product.name}
        </h3>
        
        {/* Responsive Description */}
        <p className="text-gray-400 text-xs sm:text-sm mb-4 sm:mb-6 line-clamp-2 flex-1 leading-relaxed">
          {product.description || "No description provided."}
        </p>

        {/* Footer Area (Price & Button) */}
        <div className="flex items-center justify-between mt-auto pt-3 sm:pt-4 border-t border-white/10 pointer-events-auto">
          {/* Responsive Price */}
          <span className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
            ${product.price}
          </span>
          
          {/* Add to Cart Button - Touch friendly sizing */}
          <button 
            onClick={handleAddToCart} 
            disabled={added}
            className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all z-20 relative active:scale-95 shadow-lg ${
              added 
                ? "bg-emerald-500 text-white shadow-emerald-500/20" 
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20"
            }`}
          >
            {added ? "Added ✓" : "Add to Cart"}
          </button>
        </div>
      </div>
      
    </div>
  );
}