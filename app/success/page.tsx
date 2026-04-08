"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SuccessPage() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // ဝင်ဝင်ချင်း Animation ပြရန်
    setMounted(true);

    // အစ်ကို့ရဲ့ Auto-redirect logic (စာဖတ်ချိန်ရအောင် 10 စက္ကန့် ထားပေးထားပြီး Account Page ကို သွားခိုင်းထားပါတယ်)
    const timer = setTimeout(() => {
      router.push('/my-account');
    }, 10000); 

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-4 sm:px-6 relative overflow-hidden pt-10 sm:pt-20">
      {/* Celebration Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-emerald-600/20 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none -z-10"></div>

      <div className={`w-full max-w-lg bg-white/5 border border-white/10 p-6 sm:p-10 rounded-[2rem] sm:rounded-3xl shadow-2xl backdrop-blur-xl relative z-10 text-center transform transition-all duration-700 ${mounted ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}>
        
        {/* Animated Checkmark */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 border-2 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
          <svg className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-3 sm:mb-4">
          Order Successful! 🎉
        </h1>
        
        <p className="text-gray-400 text-sm sm:text-base leading-relaxed mb-6 sm:mb-8 px-2">
          Thank you for your purchase. We are verifying your payment. Once approved, you can access your premium assets in your account.
        </p>

        {/* Steps to follow */}
        <div className="bg-black/40 rounded-2xl p-4 sm:p-5 text-left mb-6 sm:mb-8 border border-white/5 space-y-3 sm:space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
            <p className="text-xs sm:text-sm text-gray-300">Wait for our admin to verify your payment (usually takes a few minutes).</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
            <p className="text-xs sm:text-sm text-gray-300">Go to <span className="text-white font-bold">My Account</span> and log in.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
          <Link 
            href="/my-account" 
            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 py-3.5 sm:py-4 rounded-xl font-bold text-white shadow-lg transition-all text-sm sm:text-base active:scale-95 text-center"
          >
            Go to My Account
          </Link>
          <Link 
            href="/shop" 
            className="flex-1 bg-white/10 hover:bg-white/20 py-3.5 sm:py-4 rounded-xl font-bold text-white transition-all text-sm sm:text-base active:scale-95 text-center"
          >
            Continue Shopping
          </Link>
        </div>

        {/* Redirecting Indicator */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs sm:text-sm text-indigo-400 font-medium">
            Redirecting to your account in 10s...
          </p>
        </div>

      </div>
    </div>
  );
}