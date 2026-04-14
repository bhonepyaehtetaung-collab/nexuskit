"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

export default function CustomerPortal() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  const [user, setUser] = useState<any>(null);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [fetchingData, setFetchingData] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [uploadingSlipId, setUploadingSlipId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => { checkUser(); }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      fetchMyOrders(session.user.email);
    } else { setFetchingData(false); }
  };
const [notification, setNotification] = useState<{title: string, desc: string, type: 'success' | 'warning'} | null>(null);
// 🌟 Supabase Real-time Alerts for Customer 🌟
  useEffect(() => {
    checkUser();
    
    // Customer ရဲ့ Email နဲ့ ညီတဲ့ အော်ဒါ ပြောင်းလဲမှုများကိုသာ ဖမ်းယူမည်
    if (user?.email) {
      const channel = supabase.channel('customer-orders')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `customer_email=eq.${user.email}` }, (payload: any) => {
           
           if (payload.new.status === 'completed' && payload.old.status !== 'completed') {
               setNotification({ type: 'success', title: "✅ အော်ဒါ အောင်မြင်ပါသည်!", desc: "Credentials များကို ဝင်ရောက်ကြည့်ရှုနိုင်ပါပြီ။" });
               fetchMyOrders(user.email);
               setTimeout(() => setNotification(null), 8000);
           } 
           else if (payload.new.status === 'awaiting_payment' && payload.old.status !== 'awaiting_payment') {
               setNotification({ type: 'warning', title: "⚠️ အကောင့် Setup ပြီးပါပြီ!", desc: "ကျေးဇူးပြု၍ ငွေလွှဲပြေစာ (Slip) တင်ပေးပါ။" });
               fetchMyOrders(user.email);
               setTimeout(() => setNotification(null), 8000);
           }

        })
        .subscribe();

      return () => { supabase.removeChannel(channel); }
    }
  }, [user?.email]);
  const fetchMyOrders = async (userEmail: string | undefined) => {
    if (!userEmail) return;
    const { data } = await supabase.from("orders").select("*").eq("customer_email", userEmail).order("created_at", { ascending: false });
    if (data) setMyOrders(data);
    setFetchingData(false);
  };

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setMessage("");
    const { error } = await supabase.auth.signInWithOtp({ email: email, options: { emailRedirectTo: `${window.location.origin}/my-account` } });
    if (error) setMessage("Error: " + error.message);
    else setMessage("✨ Login link ပို့လိုက်ပါပြီ! သင့် Email ကို စစ်ဆေးပြီး Link ကို နှိပ်ပါ။");
    setLoading(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); setMyOrders([]); };

  const handleUploadSlip = async (orderId: string) => {
      if (!slipFile) return alert("ကျေးဇူးပြု၍ ငွေလွှဲပြေစာ ပုံရွေးချယ်ပေးပါ");
      setUploadingSlipId(orderId);
      try {
          const fileExt = slipFile.name.split('.').pop();
          const fileName = `slip_post_${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from("products").upload(fileName, slipFile);
          if (uploadError) throw uploadError;
          const slipUrl = supabase.storage.from("products").getPublicUrl(fileName).data.publicUrl;
          const { error: updateError } = await supabase.from("orders").update({ slip_url: slipUrl, status: "pending" }).eq("id", orderId);
          if (updateError) throw updateError;

          alert("ငွေလွှဲပြေစာ တင်ခြင်းအောင်မြင်ပါသည်။ Admin မှ စစ်ဆေးနေပါသည်။");
          setSlipFile(null); setSelectedOrder(null); fetchMyOrders(user.email);
      } catch (error: any) { alert("Error: " + error.message); } finally { setUploadingSlipId(null); }
  };

  if (fetchingData) return <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center animate-pulse font-bold">Loading Portal...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-indigo-600/20 rounded-full blur-[100px] -z-10"></div>
        <div className="w-full max-w-md bg-white/5 border border-white/10 p-8 rounded-3xl shadow-2xl backdrop-blur-xl text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6">👤</div>
          <h1 className="text-3xl font-black text-white mb-2">My Account</h1>
          <p className="text-gray-400 text-sm mb-8">Enter the email you used during checkout.</p>
          {message && <div className={`p-4 rounded-xl mb-6 text-sm font-bold ${message.includes('Error') ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{message}</div>}
          <form onSubmit={handleMagicLinkLogin} className="space-y-4">
            <input required type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-indigo-500 text-center" />
            <button disabled={loading} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50">{loading ? "Sending..." : "Send Login Link"}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 pb-20 px-4 md:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center bg-white/5 border border-white/10 p-6 md:p-8 rounded-3xl mb-10 shadow-xl gap-4">
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-xl font-bold">{user.email?.charAt(0).toUpperCase()}</div>
             <div><h1 className="text-xl md:text-2xl font-bold text-white">Welcome back!</h1><p className="text-gray-400 text-sm">{user.email}</p></div>
          </div>
          <button onClick={handleLogout} className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-xl font-bold transition-all text-sm">Logout</button>
        </div>

        <h2 className="text-2xl font-bold mb-6 text-indigo-400">My Purchases & Subscriptions</h2>
        
        {myOrders.length === 0 ? (
          <div className="bg-white/5 border border-white/10 p-12 rounded-3xl text-center">
             <p className="text-gray-400 text-lg mb-6">You haven't purchased anything yet.</p>
             <Link href="/shop" className="inline-block bg-indigo-600 px-8 py-3 rounded-xl font-bold shadow-lg">Browse Shop</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {myOrders.map((order) => (
                <div key={order.id} className="bg-white/5 border border-white/10 p-6 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between md:items-start gap-6 hover:border-indigo-500/30 transition-all">
                   <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-sm font-mono text-gray-500">#{order.id.toString().slice(0,8)}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                            order.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 
                            order.status === 'awaiting_payment' ? 'bg-blue-500/20 text-blue-400' : 
                            'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {order.status === 'awaiting_payment' ? 'Payment Required' : order.status}
                        </span>
                      </div>
                      
                      {/* 🌟 ဤနေရာတွင် ပစ္စည်းတစ်ခုချင်းစီအတွက် UI ခွဲထုတ်ထားပါသည် 🌟 */}
                      <div className="space-y-4">
                        {(order.items || []).map((item: any, idx: number) => {
                          const hasEndDate = item.end_date != null;
                          let daysLeft = 0;
                          if (hasEndDate) {
                             daysLeft = Math.ceil((new Date(item.end_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                          }
                          const isSub = item.subscription_days && item.subscription_days > 0;

                          return (
                            <div key={idx} className="flex items-start gap-4 p-3 bg-black/20 rounded-xl border border-white/5">
                               <img src={item.image || "https://placehold.co/150"} className="w-14 h-14 rounded-lg object-cover bg-white/5 flex-shrink-0" />
                               <div className="flex-1 min-w-0">
                                 <p className="font-bold text-white text-base truncate">{item.name}</p>
                                 <p className="text-xs text-gray-400 mb-1">Qty: {item.quantity || 1} • {item.product_type || "Asset"}</p>
                                 
                                 {/* Item Status Tag */}
                                 {order.status === 'completed' && isSub && (
                                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${daysLeft > 0 ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>
                                      {daysLeft > 0 ? `${daysLeft} Days Left` : 'Expired'}
                                    </span>
                                 )}
                                 {order.status === 'completed' && !isSub && (
                                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">Lifetime / Permanent</span>
                                 )}
                               </div>
                            </div>
                          )
                        })}
                      </div>
                   </div>

                   <div className="md:text-right border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 flex flex-col justify-end h-full">
                      <p className="text-2xl font-black text-emerald-400 mb-4">${order.total_amount}</p>

                      {order.status === 'completed' && (
                        <button onClick={() => setSelectedOrder(order)} className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg active:scale-95">View Access Details</button>
                      )}
                      
                      {order.status === 'awaiting_payment' && (
                        <button onClick={() => setSelectedOrder(order)} className="bg-blue-600 hover:bg-blue-500 px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg active:scale-95 animate-pulse">Upload Payment Slip</button>
                      )}

                      {order.status === 'pending' && (
                        <p className={`text-sm italic mt-2 ${order.slip_url?.includes('placehold') ? 'text-emerald-400' : 'text-yellow-400'}`}>
                          {order.slip_url?.includes('placehold') ? "Setting up your service..." : "Verifying payment..."}
                        </p>
                      )}
                   </div>
                </div>
            ))}
          </div>
        )}
      </div>

      {/* --- 🌟 ORDER DETAILS MODAL 🌟 --- */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#111] border border-white/10 p-6 md:p-8 rounded-3xl w-full max-w-xl shadow-2xl relative m-auto my-8">
            <button onClick={() => setSelectedOrder(null)} className="absolute top-6 right-6 text-gray-400 hover:text-white font-black text-xl">✕</button>
            <h3 className="text-2xl font-bold text-white mb-2">Order Info</h3>
            <p className="text-sm text-emerald-400 font-mono mb-6 border-b border-white/10 pb-4">Order #{selectedOrder.id.toString().slice(0,8)}</p>

            <div className="mt-4">
               {/* Credentials */}
               {selectedOrder.admin_note && (
                 <div className="bg-emerald-500/10 p-5 rounded-xl border border-emerald-500/30 mb-6">
                    <p className="text-xs text-emerald-400 mb-3 font-bold uppercase">🔐 Your Access Credentials:</p>
                    <div className="font-mono text-emerald-50 text-sm bg-black p-4 rounded-xl border border-white/5 break-words">
                       {selectedOrder.admin_note.split('\n').map((line: string, i: number) => <p key={i}>{line}</p>)}
                    </div>
                 </div>
               )}

               {/* Awaiting Payment Form */}
               {selectedOrder.status === 'awaiting_payment' ? (
                 <div className="bg-blue-500/10 p-6 rounded-2xl border border-blue-500/30 mb-4">
                    <h4 className="text-blue-400 font-bold mb-2 flex items-center gap-2"><span>⚠️</span> Payment Required</h4>
                    <p className="text-sm text-blue-100/80 mb-4 leading-relaxed">
                        ဝန်ဆောင်မှုကို အောင်မြင်စွာ Setup လုပ်ပေးပြီးပါပြီ။ အကောင့်ကို ဝင်ရောက်စမ်းသပ်ပြီး အဆင်ပြေပါက အောက်တွင် ငွေလွှဲပြေစာ (Slip) တင်ပေးပါရန် မေတ္တာရပ်ခံအပ်ပါသည်။
                    </p>
                    <input type="file" accept="image/*" onChange={e => setSlipFile(e.target.files?.[0] || null)} className="w-full bg-black/50 border border-blue-500/30 p-3 rounded-xl text-sm mb-4 text-gray-300" />
                    <button 
                        onClick={() => handleUploadSlip(selectedOrder.id)} 
                        disabled={uploadingSlipId === selectedOrder.id}
                        className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50"
                    >
                        {uploadingSlipId === selectedOrder.id ? "Uploading..." : "ပြေစာတင်မည် (Upload Slip)"}
                    </button>
                 </div>
               ) : (
                 <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                    <p className="text-sm text-gray-300 leading-relaxed">
                      <span className="text-indigo-400 font-bold block mb-1">Instruction: </span> 
                      သက်ဆိုင်ရာ Application ထဲသို့ ဝင်ရောက်အသုံးပြုနိုင်ပါသည်။ အခက်အခဲရှိပါက Customer Support သို့ ဆက်သွယ်ပါ။
                    </p>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
      {/* 🌟 Real-time Toast Notification UI 🌟 */}
      {notification && (
        <div className={`fixed top-5 right-5 z-[1000] p-5 rounded-2xl shadow-2xl animate-in slide-in-from-top-5 border ${notification.type === 'success' ? 'bg-emerald-600 border-emerald-400' : 'bg-blue-600 border-blue-400'}`}>
           <h4 className="font-bold text-white text-lg">{notification.title}</h4>
           <p className="text-sm text-white/90 mt-1">{notification.desc}</p>
           <button onClick={() => setNotification(null)} className="absolute top-2 right-3 text-white/50 hover:text-white">✕</button>
        </div>
      )}
    </div>
  );
}