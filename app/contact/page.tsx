import { createClient } from "@/utils/supabase/server";

export default async function ContactPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase.from("site_settings").select("*").eq("id", 1).single();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-32 pb-20 px-6 relative overflow-hidden">
      {/* Premium Glow Background */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[150px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none -z-10"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Dynamic Header Section */}
        <div className="text-center mb-24 space-y-6">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
            {settings?.contact_page_title || "Get in Touch"}
          </h1>
          <p className="text-gray-400 text-xl max-w-2xl mx-auto font-medium">
            {settings?.contact_page_subtitle || "We are here to help and answer any question you might have."}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Info Cards (DYNAMIC) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/10 p-8 rounded-3xl hover:bg-white/[0.04] transition-all flex items-start space-x-6 group">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">📧</div>
              <div><p className="text-sm text-gray-400 font-bold uppercase tracking-wider mb-1">Email Us</p><p className="text-xl font-medium text-white">{settings?.contact_email || "support@nexuskit.com"}</p></div>
            </div>
            <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/10 p-8 rounded-3xl hover:bg-white/[0.04] transition-all flex items-start space-x-6 group">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">📞</div>
              <div><p className="text-sm text-gray-400 font-bold uppercase tracking-wider mb-1">Call Directly</p><p className="text-xl font-medium text-white">{settings?.contact_phone || "+95 9123 456 789"}</p></div>
            </div>
            <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/10 p-8 rounded-3xl hover:bg-white/[0.04] transition-all flex items-start space-x-6 group">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">📍</div>
              <div><p className="text-sm text-gray-400 font-bold uppercase tracking-wider mb-1">Headquarters</p><p className="text-xl font-medium text-white">{settings?.location || "Yangon, Myanmar"}</p></div>
            </div>
          </div>

          {/* Premium Image Area (DYNAMIC Status Text) */}
          <div className="lg:col-span-7 relative h-full min-h-[500px] rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(79,70,229,0.1)] group">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#0a0a0a] via-transparent to-transparent z-10"></div>
            <img src={settings?.contact_image_url || "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1000&q=80"} className="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-[2000ms] opacity-80" />
            
            <div className="absolute bottom-10 left-10 right-10 z-20 max-w-md">
              <div className="bg-black/60 backdrop-blur-xl border border-white/20 p-6 rounded-2xl">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
                  <h4 className="text-white font-bold text-lg">
                    {settings?.contact_status_title || "Online & Ready"}
                  </h4>
                </div>
                <p className="text-gray-300 text-sm">
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