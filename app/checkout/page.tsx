"use client";

import { useCart } from "@/app/context/cartContext";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function CheckoutPage() {
  const { cart, dispatch } = useCart();
  const router = useRouter();
  const supabase = createClient();

  const [methods, setMethods] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({}); 
  const [selectedMethod, setSelectedMethod] = useState<any>(null);
  
  // 🌟 Dynamic Form States 🌟
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState(""); // Optional
  const [customerPhone, setCustomerPhone] = useState(""); // Optional
  const [dynamicInfo, setDynamicInfo] = useState<Record<string, string>>({});
  
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [issubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // ခြင်းတောင်းထဲက ပစ္စည်းတွေ လိုအပ်တဲ့ Information တွေကို စစ်ထုတ်ခြင်း
  const requiredFields = useMemo(() => {
    const fields = new Set<string>();
    cart.forEach((item: any) => { // 👈 ဤနေရာတွင် (item: any) ဟု ပြင်ပေးပါ
      if (item.required_fields && Array.isArray(item.required_fields)) {
        item.required_fields.forEach((field: string) => fields.add(field)); // 👈 ဤနေရာတွင် (field: string) ဟု ပြင်ပေးပါ
      }
    });
    return Array.from(fields);
  }, [cart]);

  useEffect(() => {
    const initCheckout = async () => {
      const [methodsRes, settingsRes] = await Promise.all([
        supabase.from("payment_methods").select("*"),
        supabase.from("site_settings").select("*").eq("id", 1).single()
      ]);
      
      if (methodsRes.data) setMethods(methodsRes.data);
      if (settingsRes.data) {
          setSettings(settingsRes.data);
      } else {
          setSettings({ enable_pay_later: true, pay_later_label: "ဝန်ဆောင်မှုအရင်ရယူမည်", pay_later_subtitle: "Setup အရင်လုပ်ပေးပါမည်။" });
      }
      setLoading(false);
    };
    initCheckout();
  }, []);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMethod) return alert("ကျေးဇူးပြု၍ ငွေပေးချေမည့်စနစ်ကို ရွေးချယ်ပေးပါ");
    
    const isPayLater = selectedMethod.id === 'pay-later';
    if (!isPayLater && !slipFile) {
        return alert("ကျေးဇူးပြု၍ ငွေလွှဲထားသော Screenshot (Slip) ကို တင်ပေးပါဗျာ");
    }

    setIsSubmitting(true);

    try {
      let slipUrl = isPayLater 
          ? "https://placehold.co/600x400/10b981/ffffff?text=Pay+After+Setup+(No+Slip)" 
          : null;

      if (!isPayLater && slipFile) {
        const fileExt = slipFile.name.split('.').pop();
        const fileName = `slip_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("products").upload(fileName, slipFile);
        if (uploadError) throw uploadError;
        slipUrl = supabase.storage.from("products").getPublicUrl(fileName).data.publicUrl;
      }

      const totalAmount = cart.reduce((total, item) => total + (Number(item.price) * (item.quantity || 1)), 0);

      // Data တွေကို စုစည်းခြင်း
      let finalNote = [];
      if (customerName) finalNote.push(`Name: ${customerName}`);
      if (customerPhone) finalNote.push(`Contact: ${customerPhone}`);
      requiredFields.forEach(field => {
         if (dynamicInfo[field]) finalNote.push(`${field}: ${dynamicInfo[field]}`);
      });
      const orderNoteStr = finalNote.join(' | ');

      const { error: insertError } = await supabase.from("orders").insert([{
        customer_name: customerName || "Customer",
        customer_email: customerEmail,
        order_note: orderNoteStr, 
        total_amount: totalAmount,
        items: cart, 
        status: "pending", 
        slip_url: slipUrl 
      }]);

      if (insertError) throw new Error("Database သို့ သိမ်းဆည်းရာတွင် အမှားအယွင်းဖြစ်နေပါသည်။");

      try {
        const botToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN; 
        const chatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;

        if (botToken && chatId) {
          let tgMessage = `${isPayLater ? "🤝 <b>[PAY AFTER SETUP] NEW ORDER</b>" : "🚨 <b>New Payment Received!</b>"}\n\n`;
          tgMessage += `📧 <b>Email:</b> ${customerEmail}\n`;
          if (customerName) tgMessage += `👤 <b>Name:</b> ${customerName}\n`;
          if (customerPhone) tgMessage += `📞 <b>Contact:</b> ${customerPhone}\n`;
          
          requiredFields.forEach(field => {
             if (dynamicInfo[field]) tgMessage += `📌 <b>${field}:</b> ${dynamicInfo[field]}\n`;
          });

          tgMessage += `\n💰 <b>Total:</b> $${totalAmount}\n`;
          tgMessage += `💳 <b>Method:</b> ${selectedMethod.provider_name}\n\n`;
          
          if (!isPayLater) {
            tgMessage += `<a href="${slipUrl}">📎 View Payment Slip</a>`;
          } else {
            tgMessage += `⚠️ <i>Admin Action: Setup service first, then collect payment.</i>\n`;
            tgMessage += `<a href="${slipUrl}">📎 View Order Tag</a>`;
          }
          
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: tgMessage, parse_mode: 'HTML' })
          });
        }
      } catch (tgError) { console.error("Telegram Error:", tgError); }

      dispatch({ type: "CLEAR_CART" });
      router.push(`/success?type=${isPayLater ? 'pay-later' : 'standard'}`);

    } catch (error: any) {
      alert(error.message);
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center font-bold">Loading Checkout...</div>;
  if (cart.length === 0) return <div className="p-10 sm:p-20 text-center font-bold">Cart ထဲတွင် ပစ္စည်းမရှိသေးပါ။</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 pb-12 px-4 sm:px-6">
      <div className="max-w-lg mx-auto flex flex-col gap-5 sm:gap-6">
        
        <div className="bg-white/5 border border-white/10 p-5 sm:p-6 rounded-[2rem] flex justify-between items-center shadow-lg">
            <span className="text-gray-300 font-bold text-sm sm:text-base">စုစုပေါင်း ကျသင့်ငွေ:</span>
            <span className="text-emerald-400 font-black text-2xl sm:text-3xl">${cart.reduce((a, b) => a + (b.price * b.quantity), 0).toFixed(2)}</span>
        </div>

        <section>
          <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 ml-2 text-gray-200">ငွေပေးချေမှုပုံစံ ရွေးချယ်ပါ</h2>
          <div className="grid grid-cols-1 gap-3">
            {settings.enable_pay_later && (
              <>
                <div onClick={() => { setSelectedMethod({ id: 'pay-later', provider_name: settings.pay_later_label || 'Pay After Setup' }); setSlipFile(null); }} className={`flex items-center gap-3 sm:gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedMethod?.id === 'pay-later' ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "border-white/5 bg-white/5 hover:bg-white/10"}`}>
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-500/20 text-emerald-400 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl">🤝</div>
                  <div className="flex-1 min-w-0"><p className="font-bold text-sm sm:text-base text-emerald-400">{settings.pay_later_label || "ဝန်ဆောင်မှုအရင်ရယူမည်"}</p><p className="text-gray-400 text-[10px] sm:text-xs">{settings.pay_later_subtitle || "Setup အရင်လုပ်ပေးပါမည်။"}</p></div>
                </div>
                <div className="flex items-center gap-2 my-2 opacity-30"><div className="h-[1px] bg-white flex-1"></div><span className="text-[10px] uppercase font-bold tracking-widest">OR PAY NOW</span><div className="h-[1px] bg-white flex-1"></div></div>
              </>
            )}
            {methods.map((m) => (
              <div key={m.id} onClick={() => setSelectedMethod(m)} className={`flex items-center gap-3 sm:gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedMethod?.id === m.id ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(79,70,229,0.15)]" : "border-white/5 bg-white/5 hover:bg-white/10"}`}>
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-xl flex-shrink-0 p-1 flex items-center justify-center overflow-hidden"><img src={m.qr_url || `https://placehold.co/200x200/4f46e5/ffffff?text=${m.provider_name}`} className="w-full h-full object-contain" alt={m.provider_name} /></div>
                <div className="flex-1 min-w-0"><p className="font-bold text-sm sm:text-base truncate">{m.provider_name}</p><p className="text-gray-400 font-mono text-[10px] sm:text-xs truncate">{m.account_details}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white/5 p-5 sm:p-6 rounded-[2rem] border border-white/10 shadow-lg mt-2">
          <h2 className="text-base sm:text-lg font-bold mb-4 sm:mb-5 text-gray-200">အချက်အလက် ဖြည့်သွင်းပါ</h2>
          <form onSubmit={handleCheckout} className="space-y-3 sm:space-y-4">
            
            {/* Account အတွက် မဖြစ်မနေ လိုအပ်သော Email */}
            <div>
              <label className="block text-xs font-bold text-indigo-400 mb-1 ml-1 uppercase">Account Email *</label>
              <input required type="email" placeholder="My Account ပေါ်တယ်ဝင်ရန် (e.g. you@gmail.com)" className="w-full bg-black/40 border border-white/10 p-3.5 sm:p-4 rounded-xl outline-none focus:border-indigo-500 transition-all text-sm sm:text-base" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
            </div>

            {/* Optional Fields (အခြေခံ) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <input type="text" placeholder="အမည် Name (Optional)" className="w-full bg-black/40 border border-white/10 p-3.5 sm:p-4 rounded-xl outline-none focus:border-indigo-500 transition-all text-sm sm:text-base" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              <input type="text" placeholder="ဖုန်းနံပါတ် Phone (Optional)" className="w-full bg-black/40 border border-white/10 p-3.5 sm:p-4 rounded-xl outline-none focus:border-indigo-500 transition-all text-sm sm:text-base" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>

            {/* 🌟 Dynamic Required Fields (ပစ္စည်းက တောင်းမှ ပေါ်မည်) 🌟 */}
            {requiredFields.length > 0 && (
              <div className="bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/20 mt-4 space-y-3">
                 <p className="text-xs text-indigo-300 font-bold uppercase tracking-wider mb-1">Required for setup</p>
                 {requiredFields.map(field => (
                    <input 
                       key={field}
                       required 
                       type="text" 
                       placeholder={`Enter ${field}`} 
                       className="w-full bg-black/50 border border-indigo-500/30 p-3.5 sm:p-4 rounded-xl outline-none focus:border-indigo-500 transition-all text-sm sm:text-base text-white"
                       onChange={(e) => setDynamicInfo({...dynamicInfo, [field]: e.target.value})}
                    />
                 ))}
              </div>
            )}

            {/* Slip Upload */}
            {selectedMethod && selectedMethod.id !== 'pay-later' && (
              <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                <label className="block text-xs sm:text-sm font-bold text-gray-300 mb-2">ငွေလွှဲပြေစာ (Screenshot) တင်ရန် *</label>
                <input required type="file" accept="image/*" onChange={(e) => setSlipFile(e.target.files?.[0] || null)} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl outline-none focus:border-indigo-500 text-sm sm:text-base text-gray-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-500/20 file:text-indigo-400 cursor-pointer" />
              </div>
            )}
            
            <button type="submit" disabled={issubmitting} className={`w-full py-4 sm:py-5 rounded-xl font-black text-base sm:text-lg mt-4 sm:mt-6 disabled:opacity-50 transition-all shadow-[0_4px_20px_rgba(79,70,229,0.3)] active:scale-95 ${selectedMethod?.id === 'pay-later' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'}`}>
              {issubmitting ? "Processing..." : (selectedMethod?.id === 'pay-later' ? (settings.pay_later_label || "ဝန်ဆောင်မှု အရင်ရယူမည်") : "Confirm & Order")}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}