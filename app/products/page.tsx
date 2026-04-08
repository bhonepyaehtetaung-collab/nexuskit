"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import ProductCard from "../components/ProductCard";

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const [prodRes, catRes, setRes] = await Promise.all([
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase.from("product_categories").select("name").order("created_at", { ascending: true }),
        supabase.from("site_settings").select("*").eq("id", 1).single()
      ]);
      setProducts(prodRes.data || []);
      setCategories(catRes.data || []);
      setSettings(setRes.data || {});
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesCat = activeCategory === "All" || p.product_type === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto text-center mb-8 sm:mb-12">
        {/* Responsive Titles */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-3 sm:mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 px-2 leading-tight">
          {settings.shop_title || "Our Digital Assets"}
        </h1>
        <p className="text-gray-400 text-sm sm:text-lg px-4">
          {settings.shop_subtitle || "Browse our premium collection."}
        </p>
        
        {/* Search Bar - Adjusted Padding for Mobile */}
        <div className="max-w-md mx-auto mt-6 sm:mt-8 relative px-2 sm:px-0">
          <input 
            type="text" 
            placeholder="Search products..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 sm:py-4 bg-white/5 border border-white/10 rounded-full outline-none focus:border-indigo-500 transition-colors shadow-xl text-sm sm:text-base"
          />
          <span className="absolute left-6 sm:left-5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        </div>
      </div>

      {/* Dynamic Category Tabs - Horizontal Scroll for Mobile */}
      <div className="mb-10 sm:mb-16 max-w-4xl mx-auto">
        <div className="flex flex-row overflow-x-auto sm:flex-wrap justify-start sm:justify-center gap-3 sm:gap-4 pb-4 sm:pb-0 px-2 sm:px-0 scrollbar-hide snap-x">
          <button 
            onClick={() => setActiveCategory("All")}
            className={`whitespace-nowrap snap-start px-6 py-2.5 sm:px-8 sm:py-3 rounded-full font-bold text-sm sm:text-base transition-all flex-shrink-0 ${
              activeCategory === "All" 
                ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]" 
                : "bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10"
            }`}
          >
            All Assets
          </button>
          {categories.map(cat => (
            <button 
              key={cat.name} 
              onClick={() => setActiveCategory(cat.name)}
              className={`whitespace-nowrap snap-start px-6 py-2.5 sm:px-8 sm:py-3 rounded-full font-bold text-sm sm:text-base transition-all flex-shrink-0 ${
                activeCategory === cat.name 
                  ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]" 
                  : "bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid State Handling */}
      {loading ? (
        <div className="text-center text-indigo-400 font-bold text-lg sm:text-2xl mt-10 sm:mt-20 animate-pulse">
          Loading amazing products...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center text-gray-500 font-medium mt-10 sm:mt-20 text-sm sm:text-base">
          No products found.
        </div>
      ) : (
        /* Responsive Grid: 1 col (Mobile) -> 2 cols (Tablet) -> 3/4 cols (Desktop) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-8 max-w-7xl mx-auto">
          {filteredProducts.map(product => <ProductCard key={product.id} product={product} />)}
        </div>
      )}
    </div>
  );
}