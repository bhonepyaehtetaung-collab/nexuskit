import { createClient } from "@/utils/supabase/server";
import ProductCard from "./components/ProductCard";
import Link from "next/link";

// ကြယ်ပွင့် (*) ကြားက စာသားကို Gradient အရောင်ပြောင်းပေးမည့် Function
const renderColoredText = (text: string) => {
  if (!text) return null;
  const parts = text.split('*');
  return (
    <>
      {parts.map((part, index) => 
        index % 2 === 1 ? (
          <span key={index} className="bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 bg-clip-text text-transparent font-extrabold">
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
};

export default async function HomePage() {
  const supabase = await createClient();
  
  // Database မှ Product များနှင့် Admin Settings များကို ဆွဲယူခြင်း
  const [productsRes, settingsRes] = await Promise.all([
    supabase.from("products").select("*").order("created_at", { ascending: false }).limit(6),
    supabase.from("site_settings").select("*").eq("id", 1).single()
  ]);

  const products = productsRes.data || [];
  const settings = settingsRes.data || {};

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* --- HERO SECTION --- */}
      <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden text-center space-y-8 px-6">
        {/* Premium Background Glow Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none -z-10"></div>
        
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight z-10 relative">
          {renderColoredText(settings.hero_title || "Crafted for *Modern Creators*")}
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto text-lg md:text-xl font-medium z-10 relative">
          {settings.hero_subtitle || "Elevate your creative workflow with top-tier UI kits, templates, and graphics."}
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-8 z-10 relative">
          <Link href="/products" className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-10 py-4 rounded-xl transition-all shadow-lg shadow-indigo-500/25 text-lg">
            {settings.home_explore_button || "Explore Assets"}
          </Link>
        </div>
      </div>

      {/* --- FEATURED PRODUCTS SECTION --- */}
      <div className="max-w-7xl mx-auto px-6 pb-32 relative z-10">
        <div className="flex justify-between items-end mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            {settings.home_featured_title || "Featured Products"}
          </h2>
          <Link href="/products" className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">View All →</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map(product => <ProductCard key={product.id} product={product} />)}
        </div>
      </div>
    </div>
  );
}