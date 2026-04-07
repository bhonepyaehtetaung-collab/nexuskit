"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

export default function Footer() {
  const [settings, setSettings] = useState<any>({});
  const supabase = createClient();

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from("site_settings").select("*").eq("id", 1).single();
      if (data) setSettings(data);
    };
    fetchSettings();
  }, []);

  return (
    <footer className="bg-[#050505] border-t border-white/10 pt-16 pb-8 mt-auto">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          
          {/* Brand & Description */}
          <div className="space-y-4">
            <Link href="/" className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-600 hover:opacity-80 transition-opacity">
              NexusKit
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
              {settings?.footer_description || "Premium digital assets, UI kits, and resources for modern creators. Elevate your next project with us."}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Quick Links</h4>
            <ul className="space-y-3">
              <li><Link href="/" className="text-gray-400 hover:text-indigo-400 transition-colors text-sm font-medium">Home</Link></li>
              <li><Link href="/products" className="text-gray-400 hover:text-indigo-400 transition-colors text-sm font-medium">Shop</Link></li>
              <li><Link href="/about" className="text-gray-400 hover:text-indigo-400 transition-colors text-sm font-medium">About Us</Link></li>
              <li><Link href="/contact" className="text-gray-400 hover:text-indigo-400 transition-colors text-sm font-medium">Contact</Link></li>
            </ul>
          </div>

          {/* Contact & Socials */}
          <div>
            <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Connect With Us</h4>
            <div className="space-y-3 mb-6">
               <p className="text-gray-400 text-sm flex items-start gap-2">
                 <span className="text-indigo-400">📍</span> 
                 <span>{settings?.location || "Yangon, Myanmar"}</span>
               </p>
               <p className="text-gray-400 text-sm flex items-start gap-2">
                 <span className="text-indigo-400">📧</span> 
                 <span>{settings?.contact_email || "support@nexuskit.com"}</span>
               </p>
               <p className="text-gray-400 text-sm flex items-start gap-2">
                 <span className="text-indigo-400">📞</span> 
                 <span>{settings?.contact_phone || "+95 9123 456 789"}</span>
               </p>
            </div>
            
            {/* Dynamic Social Links */}
            <div className="flex space-x-4">
              {settings?.facebook_url && (
                <a href={settings.facebook_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-indigo-600 hover:border-indigo-400 transition-all text-white shadow-lg">FB</a>
              )}
              {settings?.telegram_url && (
                <a href={settings.telegram_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-blue-500 hover:border-blue-400 transition-all text-white shadow-lg">TG</a>
              )}
              {settings?.instagram_url && (
                <a href={settings.instagram_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-pink-600 hover:border-pink-500 transition-all text-white shadow-lg">IG</a>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="border-t border-white/10 pt-8 text-center md:text-left flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm font-medium">
            {settings?.footer_text || "© 2026 NexusKit. All rights reserved."}
          </p>
        </div>
      </div>
    </footer>
  );
}