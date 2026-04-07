import { createClient } from "@/utils/supabase/server";
import Link from "next/link";

const renderColoredText = (text: string) => {
  if (!text) return null;
  const parts = text.split('*');
  return <>{parts.map((part, index) => index % 2 === 1 ? <span key={index} className="bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 bg-clip-text text-transparent font-extrabold">{part}</span> : <span key={index}>{part}</span>)}</>;
};

export default async function AboutPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase.from("site_settings").select("*").eq("id", 1).single();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-32 pb-20 px-6 relative overflow-hidden">
      <div className="absolute top-20 left-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Text Content (DYNAMIC) */}
          <div className="space-y-8 z-10">
            <div className="inline-block px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-indigo-400 text-sm font-bold tracking-wider uppercase">
              {settings?.about_badge || "OUR STORY"}
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1]">
              {renderColoredText(settings?.about_title || "About *NexusKit*")}
            </h1>
            <p className="text-gray-400 text-lg md:text-xl leading-relaxed whitespace-pre-wrap font-medium">
              {settings?.about_text || "We believe that great design shouldn't be built from scratch every time."}
            </p>
            
            <div className="grid grid-cols-2 gap-6 pt-6 pb-6">
               <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                 <h4 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500 mb-2">
                   {settings?.about_stat_1_val || "99%"}
                 </h4>
                 <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">
                   {settings?.about_stat_1_text || "CLIENT SATISFACTION"}
                 </p>
               </div>
               <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                 <h4 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mb-2">
                   {settings?.about_stat_2_val || "24/7"}
                 </h4>
                 <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">
                   {settings?.about_stat_2_text || "PREMIUM SUPPORT"}
                 </p>
               </div>
            </div>

            <Link href="/products" className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-10 py-4 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/25 text-lg">
              {settings?.about_button_text || "အခုပဲကြည့်မယ်"}
            </Link>
          </div>

          {/* Right Image Section (DYNAMIC) */}
          <div className="relative h-[600px] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(79,70,229,0.15)] group z-10">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#0a0a0a]/80 via-transparent to-transparent z-10"></div>
            <img 
              src={settings?.about_image_url || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80"} 
              alt="About Us" 
              className="object-cover w-full h-full transform group-hover:scale-110 transition-transform duration-[2000ms] opacity-90" 
            />
            
            <div className="absolute bottom-10 left-10 right-10 z-20">
              <div className="bg-black/40 backdrop-blur-xl border border-white/20 p-6 rounded-2xl flex items-center space-x-6">
                 <div className="w-14 h-14 bg-indigo-500 rounded-full flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/50 animate-bounce">🚀</div>
                 <div>
                   <h4 className="text-white font-bold text-lg">
                     {settings?.about_floating_title || "Built for Creators"}
                   </h4>
                   <p className="text-gray-300 text-sm">
                     {settings?.about_floating_text || "We empower your digital journey."}
                   </p>
                 </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}