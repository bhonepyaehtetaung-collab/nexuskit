"use client";

import { useState, useMemo } from 'react';
import ProductCard from '@/app/components/ProductCard';

// Type Error မတက်စေရန် any[] ကို ယာယီအသုံးပြုထားပါသည်
interface ShopClientProps {
  initialProducts: any[]; 
}

export default function ShopClient({ initialProducts }: ShopClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Error အကာအကွယ်: Database ထဲမှာ category မရှိခဲ့ရင် 'Digital Assets' လို့ အလိုအလျောက် သတ်မှတ်ပေးပါမည်
  const products = initialProducts.map(p => ({
    ...p,
    category: p.category || 'Digital Assets'
  }));

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = useMemo(() => {
    let currentProducts = products;

    if (selectedCategory !== 'All') {
      currentProducts = currentProducts.filter(p => p.category === selectedCategory);
    }

    if (searchTerm) {
      currentProducts = currentProducts.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return currentProducts;
  }, [products, searchTerm, selectedCategory]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-12 selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header Section (Premium Gradient) */}
        <div className="text-center space-y-4 mt-8 md:mt-12">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 bg-clip-text text-transparent pb-2">
            Premium Digital Assets
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg md:text-xl font-medium">
            Elevate your creative projects with our hand-picked collection of high-quality resources.
          </p>
        </div>

        {/* Search & Filter Bar (Glassmorphism) */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-2xl flex flex-col md:flex-row gap-4 items-center justify-between sticky top-24 z-10">
          
          {/* Search Box */}
          <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search assets..."
              className="w-full pl-11 pr-4 py-3 bg-black/40 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Categories Button */}
          <div className="flex space-x-3 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category as string)}
                className={`whitespace-nowrap px-6 py-2.5 rounded-2xl font-medium transition-all duration-300 ${
                  selectedCategory === category 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 border border-indigo-500' 
                    : 'bg-black/40 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm">
            <div className="text-6xl mb-4 opacity-50">🛸</div>
            <h3 className="text-2xl font-semibold text-gray-300 mb-2">No items found</h3>
            <p className="text-gray-500">Try adjusting your search keywords.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}