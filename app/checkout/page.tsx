"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/app/context/cartContext";
import { createClient } from "@/utils/supabase/client";

export default function CheckoutPage() {
  const { cart, dispatch } = useCart();
  const supabase = createClient();

  const [dynamicFormData, setDynamicFormData] = useState<Record<string, string>>({});
  const [customerName, setCustomerName] = useState("");
  // 👈 My Account Portal အတွက် မရှိမဖြစ်လိုအပ်သော Email State အသစ်
  const [customerEmail, setCustomerEmail] = useState(""); 
  const [slipFile, setSlipFile] = useState<File | null>(null);
  
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");

  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [finalPaidAmount, setFinalPaidAmount] = useState(0);

  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});

  useEffect(() => {
    const fetchData = async () => {
      const [pmRes, setRes] = await Promise.all([
        supabase.from("payment_methods").select("*").eq("is_active", true).order("created_at", { ascending: true }),
        supabase.from("site_settings").select("*").eq("id", 1).single()
      ]);
      setPaymentMethods(pmRes.data || []);
      setSettings(setRes.data || {});
    };
    fetchData();
  }, []);

  const requiredFields = Array.from(new Set(cart.flatMap((item: any) => item.required_fields || [])));
  
  const totalPrice = cart.reduce((total, item) => total + (Number(item.price) * (item.quantity || 1)), 0);
  const discountAmount = appliedPromo ? (totalPrice * (appliedPromo.discount_percent / 100)) : 0;
  const finalTotalPrice = totalPrice - discountAmount;

  const handleSubmitPromo = async () => {
    if (!promoInput) return;
    setPromoError(""); 
    setAppliedPromo(null);
    const { data } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("code", promoInput.toUpperCase())
      .eq("is_active", true)
      .single();

    if (data) { 
      setAppliedPromo(data); 
      alert(`Promo Applied: ${data.discount_percent}% OFF!`); 
    } else { 
      setPromoError("Invalid promo code."); 
      setTimeout(() => setPromoError(""), 3000); 
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return alert("Your cart is empty!");
    if (!slipFile) return alert("Please upload your payment slip.");

    setLoading(true);
    const customInfoString = Object.entries(dynamicFormData)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' | ');

    try {
      const fileExt = slipFile.name.split('.').pop();
      const fileName = `slip_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      await supabase.storage.from("slip").upload(fileName, slipFile);
      const publicUrlData = supabase.storage.from("slip").getPublicUrl(fileName).data.publicUrl;

      // 👈 Database ထဲသိမ်းရာတွင် customer_email ပါ ထည့်သိမ်းပေးခြင်း
      const { data: orderData, error } = await supabase.from("orders").insert([{
          customer_name: customerName, 
          customer_email: customerEmail, 
          order_note: customInfoString,
          total_amount: finalTotalPrice.toFixed(2), 
          promo_code: appliedPromo?.code || null,
          discount_amount: discountAmount.toFixed(2), 
          status: "pending", 
          slip_url: publicUrlData, 
          items: cart
      }]).select().single();

      if (error) throw error;

      // 🚀 --- TELEGRAM NOTIFICATION စနစ် --- 🚀
      try {
        const orderIdShort = orderData.id.toString().slice(0, 8);
        const alertMessage = `
🎉 <b>New Order Received!</b>
👤 Customer: ${customerName} (${customerEmail})
💰 Total Amount: $${finalTotalPrice.toFixed(2)}
📄 Order ID: #${orderIdShort}
🧾 <a href="${publicUrlData}">View Payment Slip</a>
🔗 <a href="${window.location.origin}/admin">Open Admin Dashboard</a>
        `;

        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: alertMessage }),
        });
      } catch (tgError) {
        console.error("Telegram notification failed:", tgError);
      }
      // ----------------------------------------

      setFinalPaidAmount(finalTotalPrice); 
      setOrderId(orderData.id.toString().slice(0, 8));
      dispatch({ type: "CLEAR_CART" }); 
      setIsSuccess(true);
    } catch (error: any) { 
      alert("Failed to submit order."); 
    } finally { 
      setLoading(false); 
    }
  };

  if (isSuccess) return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl w-full bg-white/5 border border-emerald-500/30 p-10 rounded-3xl text-center space-y-6 shadow-2xl shadow-emerald-500/10">
        <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 border border-emerald-500/50">
          ✓
        </div>
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">
          {settings.order_success_title || "Order Received!"}
        </h1>
        <p className="text-lg font-bold text-gray-300 bg-black/40 py-3 px-6 rounded-xl border border-white/5 inline-block">
          Order ID: <span className="text-indigo-400 font-mono tracking-wider">#{orderId}</span>
        </p>
        <p className="text-gray-400 leading-relaxed max-w-md mx-auto text-lg">
          {settings.order_success_message || "Thank you for your purchase. We will verify your payment shortly."}
        </p>
        <div className="pt-6 border-t border-white/10 mt-6">
          <Link 
            href="/my-account" 
            className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-10 py-4 rounded-xl font-bold shadow-lg transition-all"
          >
            Go to My Account
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-32 pb-20 px-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-extrabold mb-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
          Secure Checkout
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          <div className="space-y-8 h-fit sticky top-28">
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl">
              <h2 className="text-2xl font-bold mb-6">Payment Methods</h2>
              <div className="space-y-4">
                {paymentMethods.length === 0 && (
                  <p className="text-gray-500 text-sm">No payment methods added by Admin yet.</p>
                )}
                {paymentMethods.map(pm => (
                  <div key={pm.id} className="bg-black/40 border border-white/10 p-6 rounded-2xl shadow-xl">
                    <h3 className="font-bold text-emerald-400 text-lg mb-3">{pm.provider_name}</h3>
                    <p className="font-mono text-white text-lg bg-white/5 p-4 rounded-xl text-center tracking-wider">
                      {pm.account_details}
                    </p>
                    {pm.qr_url && (
                      <div className="mt-6 flex justify-center">
                        <img src={pm.qr_url} alt="QR Code" className="w-40 h-40 object-contain bg-white p-2 rounded-2xl" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl">
                <h2 className="text-xl font-bold mb-6 border-b border-white/10 pb-4">
                  {settings.cart_order_summary || "Order Summary"}
                </h2>
                <div className="space-y-4 mb-6">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-black/20 p-4 rounded-xl border border-white/5">
                        <div>
                            <span className="text-gray-200 font-bold block">{item.name}</span>
                            <span className="text-xs text-gray-500">
                              Qty: <span className="font-bold text-white">{item.quantity || 1}</span> x ${item.price}
                            </span>
                        </div>
                        <span className="font-semibold text-emerald-400">
                          ${(Number(item.price) * (item.quantity || 1)).toFixed(2)}
                        </span>
                    </div>
                  ))}
                </div>

                {appliedPromo && (
                  <div className="flex justify-between text-emerald-400 mb-2 font-bold">
                    <span>Discount ({appliedPromo.code})</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-2xl font-black pt-4 border-t border-white/10">
                  <span>Total to Pay</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
                    ${finalTotalPrice.toFixed(2)}
                  </span>
                </div>
            </div>
            
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl">
                <label className="block text-sm font-medium text-gray-300 mb-2">Have a promo code?</label>
                <div className="flex gap-4">
                  <input 
                    type="text" 
                    value={promoInput} 
                    onChange={e => setPromoInput(e.target.value)} 
                    className="flex-1 px-4 py-3 bg-black/40 border border-white/10 rounded-xl uppercase outline-none focus:border-indigo-500" 
                  />
                  <button 
                    type="button" 
                    onClick={handleSubmitPromo} 
                    className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl font-bold transition-all"
                  >
                    Apply
                  </button>
                </div>
                {promoError && <p className="text-xs text-red-400 mt-2">{promoError}</p>}
            </div>

            <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-6">
              <h3 className="text-xl font-bold text-gray-200 mb-4">Customer Info</h3>
              
              <div className="space-y-4">
                <input 
                  required 
                  type="text" 
                  placeholder="Full Name" 
                  value={customerName} 
                  onChange={e => setCustomerName(e.target.value)} 
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-indigo-500" 
                />
                
                {/* 👈 Customer Email တောင်းမည့် အကွက်အသစ် */}
                <input 
                  required 
                  type="email" 
                  placeholder="Email Address (To receive your files)" 
                  value={customerEmail} 
                  onChange={e => setCustomerEmail(e.target.value)} 
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-indigo-500" 
                />
              </div>
              
              {requiredFields.map((fieldStr: any) => (
                <div key={fieldStr} className="pt-2">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {fieldStr} <span className="text-red-400">*</span>
                  </label>
                  <input 
                    required 
                    type="text" 
                    value={dynamicFormData[fieldStr] || ""} 
                    onChange={e => setDynamicFormData({...dynamicFormData, [fieldStr]: e.target.value})} 
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-indigo-500" 
                  />
                </div>
              ))}

              <div className="pt-4 border-t border-white/10">
                <label className="block text-sm font-medium text-gray-400 mb-2">Upload Payment Slip</label>
                <input 
                  required 
                  type="file" 
                  accept="image/*" 
                  onChange={e => setSlipFile(e.target.files?.[0] || null)} 
                  className="w-full px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-sm cursor-pointer" 
                />
              </div>

              <button 
                disabled={loading} 
                type="submit" 
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 py-4 rounded-xl font-bold text-white shadow-lg shadow-indigo-500/30 transition-all"
              >
                {loading ? "Processing..." : "Confirm & Submit"}
              </button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}