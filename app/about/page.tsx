import { createClient } from "@/utils/supabase/server";
import Link from "next/link";

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

export default async function AboutPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase.from("site_settings").select("*").eq("id", 1).single();

  return (
    // Responsive Padding
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 relative overflow-hidden">
      {/* Responsive Glow Effect */}
      <div className="absolute top-10 sm:top-20 left-1/2 sm:left-0 -translate-x-1/2 sm:translate-x-0 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-indigo-600/20 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none -z-10"></div>
      
      <div className="max-w-7xl mx-auto">
        {/* Responsive Grid Gap */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-16 items-center">
          
          {/* --- Left Text Content (DYNAMIC) --- */}
          <div className="space-y-6 sm:space-y-8 z-10 text-center lg:text-left">
            <div className="inline-block px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-indigo-400 text-xs sm:text-sm font-bold tracking-wider uppercase">
              {settings?.about_badge || "OUR STORY"}
            </div>
            
            {/* Responsive Typography */}
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight leading-[1.1]">
              {renderColoredText(settings?.about_title || "About *NexusKit*")}
            </h1>
            <p className="text-gray-400 text-base sm:text-lg md:text-xl leading-relaxed whitespace-pre-wrap font-medium px-2 sm:px-0">
              {settings?.about_text || "We believe that great design shouldn't be built from scratch every time."}
            </p>
            
            {/* Responsive Stats Grid */}
            <div className="grid grid-cols-2 gap-4 sm:gap-6 pt-2 sm:pt-6 pb-2 sm:pb-6">
               <div className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-[1rem] sm:rounded-2xl shadow-lg">
                 <h4 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500 mb-1 sm:mb-2">
                   {settings?.about_stat_1_val || "99%"}
                 </h4>
                 <p className="text-gray-400 text-[10px] sm:text-sm font-bold uppercase tracking-wider">
                   {settings?.about_stat_1_text || "CLIENT SATISFACTION"}
                 </p>
               </div>
               <div className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-[1rem] sm:rounded-2xl shadow-lg">
                 <h4 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mb-1 sm:mb-2">
                   {settings?.about_stat_2_val || "24/7"}
                 </h4>
                 <p className="text-gray-400 text-[10px] sm:text-sm font-bold uppercase tracking-wider">
                   {settings?.about_stat_2_text || "PREMIUM SUPPORT"}
                 </p>
               </div>
            </div>

            {/* Mobile Touch-Friendly Button */}
            <Link 
              href="/products" 
              className="inline-block w-full sm:w-auto text-center bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 sm:px-10 py-3.5 sm:py-4 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/25 text-base sm:text-lg active:scale-95"
            >
              {settings?.about_button_text || "အခုပဲကြည့်မယ်"}
            </Link>
          </div>

          {/* --- Right Image Section (DYNAMIC) --- */}
          {/* Responsive Height: 400px on mobile, 500px on tablet, 600px on desktop */}
          <div className="relative h-[400px] sm:h-[500px] lg:h-[600px] rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(79,70,229,0.15)] sm:shadow-[0_0_100px_rgba(79,70,229,0.15)] group z-10 mt-4 sm:mt-0">
            <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-tr from-[#0a0a0a]/90 via-[#0a0a0a]/40 to-transparent z-10"></div>
            <img 
              src={settings?.about_image_url || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80"} 
              alt="About Us" 
              className="object-cover w-full h-full transform group-hover:scale-105 sm:group-hover:scale-110 transition-transform duration-[2000ms] opacity-90" 
            />
            
            {/* Floating Card - Responsive Positioning and Padding */}
            <div className="absolute bottom-4 left-4 right-4 sm:bottom-10 sm:left-10 sm:right-10 z-20">
              <div className="bg-black/60 sm:bg-black/40 backdrop-blur-xl border border-white/20 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-2xl flex items-center space-x-4 sm:space-x-6">
                 <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-500 flex-shrink-0 rounded-full flex items-center justify-center text-xl sm:text-2xl shadow-lg shadow-indigo-500/50 animate-bounce">
                   🚀
                 </div>
                 <div>
                   <h4 className="text-white font-bold text-base sm:text-lg leading-tight mb-1 sm:mb-0">
                     {settings?.about_floating_title || "Built for Creators"}
                   </h4>
                   <p className="text-gray-300 text-xs sm:text-sm">
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