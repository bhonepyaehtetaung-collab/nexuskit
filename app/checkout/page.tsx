"use client";

import { useCart } from "@/app/context/cartContext";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function CheckoutPage() {
  const { cart, dispatch } = useCart();
  const router = useRouter();
  const supabase = createClient();

  const [methods, setMethods] = useState<any[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<any>(null);
  const [customerInfo, setCustomerInfo] = useState<any>({});
  const [issubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchMethods = async () => {
      const { data } = await supabase.from("payment_methods").select("*");
      if (data) setMethods(data);
    };
    fetchMethods();
  }, []);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMethod) return alert("ကျေးဇူးပြု၍ ငွေပေးချေမည့်စနစ်ကို ရွေးချယ်ပေးပါ");
    
    setIsSubmitting(true);
    // Order Table ထဲသို့ သိမ်းဆည်းမည့် Logic များ ဤနေရာတွင် ဆက်လက်ရေးသားနိုင်ပါသည်...
    // ဥပမာ - await supabase.from('orders').insert([...]);
    
    alert("Order တင်ခြင်း အောင်မြင်ပါသည်။");
    dispatch({ type: "CLEAR_CART" });
    router.push("/success");
  };

  if (cart.length === 0) return <div className="p-20 text-center font-bold">Cart ထဲတွင် ပစ္စည်းမရှိသေးပါ။</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-10">
      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* LEFT: Payment & Summary */}
        <div className="space-y-8 order-2 lg:order-1">
          <section>
            <h2 className="text-2xl font-black mb-6 flex items-center gap-2">
              <span className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-sm">1</span>
              Payment Methods
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {methods.map((m) => (
                <div 
                  key={m.id}
                  onClick={() => setSelectedMethod(m)}
                  className={`relative cursor-pointer p-5 rounded-3xl border-2 transition-all ${
                    selectedMethod?.id === m.id ? "border-indigo-500 bg-indigo-500/10" : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-full max-w-[200px] aspect-square bg-white rounded-2xl p-3 mb-4 shadow-2xl overflow-hidden">
                      <img 
                        src={m.qr_image_url || "/placeholder-qr.png"} 
                        alt="Payment QR" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <h3 className="text-lg font-bold text-emerald-400">{m.provider_name}</h3>
                    <p className="text-gray-400 font-mono tracking-wider">{m.account_details}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT: Customer Form */}
        <div className="order-1 lg:order-2">
          <div className="sticky top-10 space-y-8">
            <section className="bg-white/5 p-6 md:p-8 rounded-[2rem] border border-white/10 shadow-xl">
              <h2 className="text-2xl font-black mb-6 flex items-center gap-2">
                <span className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-sm">2</span>
                Customer Info
              </h2>
              <form onSubmit={handleCheckout} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Full Name</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Enter your name"
                    className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Email Address</label>
                  <input 
                    required
                    type="email" 
                    placeholder="example@gmail.com"
                    className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Telegram / WhatsApp</label>
                  <input 
                    required
                    type="text" 
                    placeholder="@username or phone"
                    className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    onChange={(e) => setCustomerInfo({...customerInfo, contact: e.target.value})}
                  />
                </div>

                <div className="pt-6 border-t border-white/5 mt-6">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-gray-400 font-bold uppercase text-xs">Total Amount</span>
                    <span className="text-3xl font-black text-indigo-400">
                      ${cart.reduce((a, b) => a + (b.price * b.quantity), 0).toFixed(2)}
                    </span>
                  </div>
                  <button 
                    disabled={issubmitting}
                    type="submit" 
                    className="w-full bg-indigo-600 hover:bg-indigo-500 py-5 rounded-2xl font-black text-lg shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {issubmitting ? "Processing..." : "Confirm & Send Receipt"}
                  </button>
                  <p className="text-[10px] text-center text-gray-500 mt-4 uppercase font-bold tracking-widest">
                    🔒 Secured by NexusKit Encryption
                  </p>
                </div>
              </form>
            </section>
          </div>
        </div>

      </div>
    </div>
  );
}