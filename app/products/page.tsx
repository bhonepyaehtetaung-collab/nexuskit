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
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto text-center mb-12">
        {/* Dynamic Titles from Admin CMS */}
        <h1 className="text-5xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
          {settings.shop_title || "Our Digital Assets"}
        </h1>
        <p className="text-gray-400 text-lg">
          {settings.shop_subtitle || "Browse our premium collection."}
        </p>
        
        {/* Search Bar */}
        <div className="max-w-md mx-auto mt-8 relative">
          <input 
            type="text" 
            placeholder="Search products..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-full outline-none focus:border-indigo-500 transition-colors shadow-2xl"
          />
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        </div>
      </div>

      {/* Dynamic Category Tabs */}
      <div className="flex flex-wrap justify-center gap-4 mb-16 max-w-4xl mx-auto">
        <button 
          onClick={() => setActiveCategory("All")}
          className={`px-8 py-3 rounded-full font-bold transition-all ${activeCategory === "All" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10"}`}
        >
          All Assets
        </button>
        {categories.map(cat => (
          <button 
            key={cat.name} onClick={() => setActiveCategory(cat.name)}
            className={`px-8 py-3 rounded-full font-bold transition-all ${activeCategory === cat.name ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10"}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* ... Product Grid remains the same ... */}
      {loading ? (
        <div className="text-center text-indigo-400 font-bold text-2xl mt-20 animate-pulse">Loading amazing products...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center text-gray-500 font-medium mt-20">No products found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {filteredProducts.map(product => <ProductCard key={product.id} product={product} />)}
        </div>
      )}
    </div>
  );
}