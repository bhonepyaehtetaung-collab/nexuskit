"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type");
  
  // URL မှာ ?type=pay-later ပါလာရင် true ဖြစ်မည်
  const isPayLater = type === "pay-later"; 

  return (
    <div className="bg-white/5 border border-white/10 p-8 sm:p-12 rounded-[2rem] sm:rounded-[3rem] shadow-2xl max-w-lg w-full text-center relative overflow-hidden animate-in zoom-in-95 duration-500">
      
      {/* Background Glow Effect */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 blur-[60px] rounded-full ${isPayLater ? 'bg-emerald-500/30' : 'bg-indigo-500/30'}`}></div>

      <div className="relative z-10">
        <div className={`w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full flex items-center justify-center mb-6 sm:mb-8 text-4xl sm:text-5xl shadow-lg border-4 ${
          isPayLater 
            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
            : "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
        }`}>
          {isPayLater ? "🤝" : "✅"}
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white mb-4">
          {isPayLater ? "တောင်းဆိုမှု အောင်မြင်ပါသည်" : "အော်ဒါတင်ခြင်း အောင်မြင်ပါသည်"}
        </h1>
        
        <p className="text-sm sm:text-base text-gray-400 leading-relaxed mb-8">
          {isPayLater ? (
            <>
              သင့်ရဲ့ <strong className="text-emerald-400">"ဝန်ဆောင်မှုအရင်ရယူမည်"</strong> တောင်းဆိုလွှာကို လက်ခံရရှိပါပြီ။ <br/>
              ကျွန်ုပ်တို့မှ စတင် Setup လုပ်ဆောင်ပေးနေပြီဖြစ်ပြီး၊ အချက်အလက်များကို သင့်ရဲ့ My Account တွင် ဝင်ရောက်စစ်ဆေးနိုင်ပါသည်။
            </>
          ) : (
            <>
              သင့်ရဲ့ အော်ဒါနဲ့ ငွေပေးချေမှု မှတ်တမ်းကို လက်ခံရရှိပါပြီ။ <br/>
              အချက်အလက်များကို စစ်ဆေးပြီးပါက ဝယ်ယူထားသော Digital Assets / Credentials များကို Telegram မှတစ်ဆင့် အမြန်ဆုံး ပေးပို့သွားပါမည်။
            </>
          )}
        </p>

        <div className="bg-black/40 p-4 sm:p-5 rounded-2xl border border-white/5 mb-8 text-left">
           <p className="text-xs sm:text-sm text-gray-300 flex items-start gap-3">
             <span className="text-lg">💡</span>
             <span>ယခု Page ကို ပိတ်နိုင်ပါပြီ။ အော်ဒါအခြေအနေကို Telegram မှတစ်ဆင့် အချိန်မရွေး စုံစမ်းမေးမြန်းနိုင်ပါသည်။</span>
           </p>
        </div>

        <Link href="/" className={`inline-block w-full sm:w-auto px-8 py-4 rounded-xl font-bold shadow-lg transition-all active:scale-95 ${
          isPayLater ? "bg-emerald-600 hover:bg-emerald-500" : "bg-indigo-600 hover:bg-indigo-500"
        }`}>
          ပင်မစာမျက်နှာသို့ ပြန်သွားမည်
        </Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      {/* Suspense is required for useSearchParams in Next.js App Router */}
      <Suspense fallback={<div className="text-white font-bold animate-pulse">Loading status...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}