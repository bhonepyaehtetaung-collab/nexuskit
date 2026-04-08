import { createClient } from "@/utils/supabase/server";

export default async function ContactPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase.from("site_settings").select("*").eq("id", 1).single();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 relative overflow-hidden">
      {/* Premium Glow Background - Responsive Sizing */}
      <div className="absolute top-0 right-0 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-indigo-600/20 rounded-full blur-[100px] sm:blur-[150px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-0 left-0 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-purple-600/10 rounded-full blur-[100px] sm:blur-[150px] pointer-events-none -z-10"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Dynamic Header Section - Responsive */}
        <div className="text-center mb-12 sm:mb-24 space-y-4 sm:space-y-6 px-2">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 leading-tight pb-2">
            {settings?.contact_page_title || "Get in Touch"}
          </h1>
          <p className="text-gray-400 text-base sm:text-xl max-w-2xl mx-auto font-medium">
            {settings?.contact_page_subtitle || "We are here to help and answer any question you might have."}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Info Cards (DYNAMIC) - Responsive */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4 sm:space-y-6">
            
            <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/10 p-5 sm:p-8 rounded-[1.5rem] sm:rounded-3xl hover:bg-white/[0.04] transition-all flex items-center sm:items-start space-x-4 sm:space-x-6 group">
              <div className="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-xl sm:text-2xl shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">📧</div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-400 font-bold uppercase tracking-wider mb-0.5 sm:mb-1">Email Us</p>
                <p className="text-base sm:text-xl font-medium text-white truncate pr-2">{settings?.contact_email || "support@nexuskit.com"}</p>
              </div>
            </div>
            
            <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/10 p-5 sm:p-8 rounded-[1.5rem] sm:rounded-3xl hover:bg-white/[0.04] transition-all flex items-center sm:items-start space-x-4 sm:space-x-6 group">
              <div className="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-xl sm:text-2xl shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">📞</div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-400 font-bold uppercase tracking-wider mb-0.5 sm:mb-1">Call Directly</p>
                <p className="text-base sm:text-xl font-medium text-white truncate pr-2">{settings?.contact_phone || "+95 9123 456 789"}</p>
              </div>
            </div>
            
            <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/10 p-5 sm:p-8 rounded-[1.5rem] sm:rounded-3xl hover:bg-white/[0.04] transition-all flex items-center sm:items-start space-x-4 sm:space-x-6 group">
              <div className="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center text-xl sm:text-2xl shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">📍</div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-400 font-bold uppercase tracking-wider mb-0.5 sm:mb-1">Headquarters</p>
                <p className="text-base sm:text-xl font-medium text-white truncate pr-2">{settings?.location || "Yangon, Myanmar"}</p>
              </div>
            </div>

          </div>

          {/* Premium Image Area (DYNAMIC Status Text) - Responsive Height */}
          <div className="lg:col-span-7 relative h-[350px] sm:h-[450px] lg:min-h-[500px] lg:h-full rounded-[2rem] sm:rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(79,70,229,0.1)] sm:shadow-[0_0_100px_rgba(79,70,229,0.1)] group mt-4 lg:mt-0">
            <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-tr from-[#0a0a0a]/90 via-[#0a0a0a]/30 to-transparent z-10"></div>
            <img src={settings?.contact_image_url || "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1000&q=80"} className="object-cover w-full h-full transform group-hover:scale-105 sm:group-hover:scale-110 transition-transform duration-[2000ms] opacity-80" />
            
            {/* Responsive Floating Status Card */}
            <div className="absolute bottom-4 left-4 right-4 sm:bottom-10 sm:left-10 sm:right-10 z-20 max-w-md mx-auto sm:mx-0">
              <div className="bg-black/60 backdrop-blur-xl border border-white/20 p-4 sm:p-6 rounded-2xl">
                <div className="flex items-center space-x-2.5 sm:space-x-3 mb-1.5 sm:mb-2">
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-500 rounded-full animate-pulse flex-shrink-0"></span>
                  <h4 className="text-white font-bold text-base sm:text-lg">
                    {settings?.contact_status_title || "Online & Ready"}
                  </h4>
                </div>
                <p className="text-gray-300 text-xs sm:text-sm">
                  {settings?.contact_status_text || "We ensure a seamless digital experience. Drop us a message for instant support."}
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}