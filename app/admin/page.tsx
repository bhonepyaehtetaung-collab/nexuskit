"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState("overview"); // 👈 Default tab ကို overview အဖြစ် ပြောင်းထားသည်
  
  // --- Auth & Role States ---
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("editor");
  
  // --- Data States ---
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [infoFields, setInfoFields] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  
  // --- Input States ---
  const [newCatName, setNewCatName] = useState("");
  const [newCatHasSub, setNewCatHasSub] = useState(false);
  const [newInfoLabel, setNewInfoLabel] = useState("");
  const [newPayment, setNewPayment] = useState({ provider_name: "", account_details: "" });
  const [pmQrFile, setPmQrFile] = useState<File | null>(null);
  const [newTeamMember, setNewTeamMember] = useState({ email: "", role: "editor", password: "" });
  
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [isProcessingUser, setIsProcessingUser] = useState(false);
  
  // --- Modal States ---
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<any>({ name: "", price: "", description: "", product_type: "", required_fields: [], subscription_days: 0 });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [newPromo, setNewPromo] = useState({ code: "", discount_percent: "" });
  const [editingTeamMember, setEditingTeamMember] = useState<any>(null);
  const [aboutImageFile, setAboutImageFile] = useState<File | null>(null);
  
  // 🌟 Order Management States 🌟
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderStatus, setOrderStatus] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [viewCustomerOrder, setViewCustomerOrder] = useState<any>(null);

  useEffect(() => { fetchData(true); }, []);

  const fetchData = async (isInitialLoad = false) => {
    if (isInitialLoad) setLoading(true);
    
    const { data: authData } = await supabase.auth.getUser();
    if (authData.user) {
        setCurrentUser(authData.user);
        const { data: roleData } = await supabase.from('team_members').select('role').eq('email', authData.user.email).single();
        if (roleData) setUserRole(roleData.role);
    } else {
        router.push("/admin/login");
        return;
    }

    const fetchSafe = async (table: string, isSingle = false) => {
        try {
            if (isSingle) {
                const { data } = await supabase.from(table).select("*").eq("id", 1).single();
                return data || {};
            } else {
                const { data } = await supabase.from(table).select("*").order("created_at", { ascending: false });
                return data || [];
            }
        } catch (e) { return isSingle ? {} : []; }
    };

    setOrders(await fetchSafe("orders")); 
    setProducts(await fetchSafe("products"));
    setPromoCodes(await fetchSafe("promo_codes")); 
    setPaymentMethods(await fetchSafe("payment_methods"));
    setCategories(await fetchSafe("product_categories")); 
    setInfoFields(await fetchSafe("customer_info_fields"));
    setSettings(await fetchSafe("site_settings", true));
    setTeamMembers(await fetchSafe("team_members"));
    
    if (isInitialLoad) setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  // --- TEAM MANAGEMENT ---
  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'super_admin') return alert("Unauthorized");
    setIsProcessingUser(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newTeamMember.email,
        password: newTeamMember.password,
      });
      if (authError) throw authError;

      const { error: dbError } = await supabase.from('team_members').insert([{
        email: newTeamMember.email,
        role: newTeamMember.role
      }]);
      if (dbError) throw dbError;

      alert(`Team member ${newTeamMember.email} successfully added!`);
      setNewTeamMember({ email: "", role: "editor", password: "" });
      fetchData(false);
    } catch (error: any) {
      alert("Error adding team member: " + error.message);
    } finally {
      setIsProcessingUser(false);
    }
  };

  const handleUpdateTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'super_admin') return;
    setIsProcessingUser(true);

    try {
      const { error: dbError } = await supabase.from('team_members').update({ role: editingTeamMember.role }).eq('id', editingTeamMember.id);
      if (dbError) throw dbError;
      alert("Team member updated successfully!");
      setEditingTeamMember(null);
      fetchData(false);
    } catch (error: any) {
      alert("Error updating team member: " + error.message);
    } finally {
      setIsProcessingUser(false);
    }
  };

  const handleDeleteRecord = async (table: string, id: string) => {
      if(!confirm("Are you sure you want to delete this?")) return;
      await supabase.from(table).delete().eq("id", id);
      fetchData(false);
  };

  // --- SYSTEM DATA HANDLERS ---
  const handleAddCategory = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    const trimmedName = newCatName.trim();
    if(!trimmedName) return;
    if(categories.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) return alert("Category already exists.");
    await supabase.from("product_categories").insert([{ name: trimmedName, has_subscription: newCatHasSub }]); 
    setNewCatName(""); setNewCatHasSub(false); fetchData(false); 
  };
  
  const handleAddInfoField = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    const trimmedLabel = newInfoLabel.trim();
    if(!trimmedLabel) return;
    if(infoFields.some(i => i.label.toLowerCase() === trimmedLabel.toLowerCase())) return alert("Field already exists.");
    await supabase.from("customer_info_fields").insert([{ label: trimmedLabel }]); 
    setNewInfoLabel(""); fetchData(false); 
  };

  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    let qrUrl = null;
    if (pmQrFile) {
        const fileName = `pm_${Date.now()}.${pmQrFile.name.split('.').pop()}`;
        await supabase.storage.from("products").upload(fileName, pmQrFile);
        qrUrl = supabase.storage.from("products").getPublicUrl(fileName).data.publicUrl;
    }
    await supabase.from("payment_methods").insert([{ provider_name: newPayment.provider_name, account_details: newPayment.account_details, qr_url: qrUrl }]);
    setNewPayment({provider_name: "", account_details: ""}); setPmQrFile(null); fetchData(false);
  };

  const handleToggleRequiredField = (label: string) => {
    setNewProduct((prev: any) => {
      const current = [...(prev.required_fields || [])];
      return current.includes(label) ? { ...prev, required_fields: current.filter((f:string) => f !== label) } : { ...prev, required_fields: [...current, label] };
    });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let imageUrl = newProduct.image;
      if (imageFile) {
        const fileName = `prod_${Date.now()}.${imageFile.name.split('.').pop()}`;
        await supabase.storage.from("products").upload(fileName, imageFile);
        imageUrl = supabase.storage.from("products").getPublicUrl(fileName).data.publicUrl;
      }
      
      const finalType = newProduct.product_type || (categories.length > 0 ? categories[0].name : "Asset");
      const selectedCat = categories.find(c => c.name === finalType);
      const subDays = selectedCat?.has_subscription ? Number(newProduct.subscription_days) : 0;

      const payload = { ...newProduct, product_type: finalType, image: imageUrl, subscription_days: subDays };
      
      if (editingProductId) { await supabase.from("products").update(payload).eq("id", editingProductId); } 
      else { await supabase.from("products").insert([payload]); }
      
      setIsProductModalOpen(false); fetchData(false); alert("Product saved successfully!");
    } catch (error) { alert("Failed to save product."); }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingSettings(true);
    try {
      let finalSettings = { ...settings };
      if (aboutImageFile) {
        const fileName = `about_${Date.now()}.${aboutImageFile.name.split('.').pop()}`;
        await supabase.storage.from("products").upload(fileName, aboutImageFile);
        finalSettings.about_image_url = supabase.storage.from("products").getPublicUrl(fileName).data.publicUrl;
      }

      await supabase.from("site_settings").upsert({ id: 1, ...finalSettings });
      setSettings(finalSettings); setAboutImageFile(null); alert("Settings Updated Successfully!");
    } catch (error) { alert("Failed to save settings."); } finally { setSavingSettings(false); }
  };

  const handleAddPromo = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    await supabase.from("promo_codes").insert([{ code: newPromo.code.toUpperCase(), discount_percent: parseFloat(newPromo.discount_percent) }]); 
    setIsPromoModalOpen(false); setNewPromo({ code: "", discount_percent: "" }); fetchData(false); 
  };

  const exportToCSV = (dataArray: any[], filename: string) => {
    if (!dataArray || dataArray.length === 0) return alert("No data to export!");
    const headers = Object.keys(dataArray[0]);
    const csvContent = [headers.join(","), ...dataArray.map(row => headers.map(k => `"${(row[k] === null || row[k] === undefined) ? "" : (typeof row[k] === 'object' ? JSON.stringify(row[k]).replace(/"/g, '""') : row[k])}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`; link.click();
  };

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center font-bold text-2xl animate-pulse">Loading Admin Workspace...</div>;

  let availableTabs: string[] = []; 
  if (userRole === 'editor') availableTabs = ['orders', 'products', 'promos', 'customers'];
  else if (userRole === 'manager') availableTabs = ['overview', 'orders', 'products', 'promos', 'customers'];
  else if (userRole === 'super_admin') availableTabs = ['overview', 'orders', 'products', 'promos', 'customers', 'team', 'settings'];
  
  if (!availableTabs.includes(activeTab)) setActiveTab(availableTabs[0]);

  // --- 🌟 ANALYTICS & DASHBOARD CALCULATIONS 🌟 ---
  const completedOrders = (orders || []).filter(o => o.status === 'completed');
  
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getTime();

  let totalRev = 0;
  let todayRev = 0;
  let monthRev = 0;
  const productCounts: Record<string, number> = {};

  const last7Days = Array.from({length: 7}, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return { dayName: d.toLocaleDateString('en-US', {weekday: 'short'}), fullDate: d.toDateString(), amount: 0 };
  });

  completedOrders.forEach(o => {
      const amount = Number(o.total_amount) || 0;
      const orderDate = new Date(o.created_at);
      const orderTime = orderDate.getTime();
      
      totalRev += amount;
      if (orderTime >= startOfToday) todayRev += amount;
      if (orderTime >= startOfMonth) {
          monthRev += amount;
          (o.items || []).forEach((item: any) => {
              productCounts[item.name] = (productCounts[item.name] || 0) + (item.quantity || 1);
          });
      }

      const oDateString = orderDate.toDateString();
      const chartItem = last7Days.find(d => d.fullDate === oDateString);
      if (chartItem) chartItem.amount += amount;
  });

  let topProductThisMonth = "No sales yet";
  let maxQty = 0;
  Object.entries(productCounts).forEach(([name, qty]) => {
      if (qty > maxQty) { maxQty = qty; topProductThisMonth = name; }
  });

  const maxChartAmount = Math.max(...last7Days.map(d => d.amount), 10); 
  // ----------------------------------------------------

  return (
    <div className="min-h-screen flex bg-[#0a0a0a] text-white">
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-white/10 min-h-screen p-6 bg-white/5 flex flex-col">
        <div className="mb-8">
            <h2 className="text-2xl font-bold text-indigo-400">NexusKit Admin</h2>
            <div className="mt-2 inline-block px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-xs font-bold text-indigo-300 uppercase tracking-wider">
                Role: {userRole.replace('_', ' ')}
            </div>
        </div>
        <nav className="space-y-2 flex-1">
          {availableTabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`w-full text-left px-4 py-3 rounded-xl capitalize transition-all ${activeTab === tab ? "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/30" : "hover:bg-white/10 text-gray-400"}`}>
              {tab}
            </button>
          ))}
        </nav>
        <div className="pt-6 border-t border-white/10 mt-auto">
          <p className="text-xs text-gray-500 truncate mb-4 px-2">{currentUser?.email}</p>
          <button onClick={handleLogout} className="w-full text-left px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors font-bold flex items-center">
            <span className="mr-3">🚪</span> Secure Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-10 overflow-y-auto">
        <h1 className="text-3xl font-extrabold mb-8 capitalize">{activeTab} Dashboard</h1>

        {/* 🌟 OVERVIEW / ANALYTICS DASHBOARD 🌟 */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* 1. KEY METRICS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent shadow-xl relative overflow-hidden group">
                 <div className="absolute -top-2 -right-2 p-4 opacity-20 text-6xl group-hover:scale-110 transition-transform">💰</div>
                 <p className="text-sm text-gray-400 font-bold mb-2 uppercase tracking-wider">Today's Sales</p>
                 <p className="text-3xl font-black text-emerald-400">${todayRev.toFixed(2)}</p>
              </div>
              <div className="p-6 rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-transparent shadow-xl relative overflow-hidden group">
                 <div className="absolute -top-2 -right-2 p-4 opacity-20 text-6xl group-hover:scale-110 transition-transform">📅</div>
                 <p className="text-sm text-gray-400 font-bold mb-2 uppercase tracking-wider">This Month</p>
                 <p className="text-3xl font-black text-blue-400">${monthRev.toFixed(2)}</p>
              </div>
              <div className="p-6 rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-transparent shadow-xl relative overflow-hidden group">
                 <div className="absolute -top-2 -right-2 p-4 opacity-20 text-6xl group-hover:scale-110 transition-transform">💎</div>
                 <p className="text-sm text-gray-400 font-bold mb-2 uppercase tracking-wider">Total Revenue</p>
                 <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-500">${totalRev.toFixed(2)}</p>
              </div>
              <div className="p-6 rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-transparent shadow-xl relative overflow-hidden group">
                 <div className="absolute -top-2 -right-2 p-4 opacity-20 text-6xl group-hover:scale-110 transition-transform">🏆</div>
                 <p className="text-sm text-gray-400 font-bold mb-2 uppercase tracking-wider">Top Product (Month)</p>
                 <p className="text-xl font-black text-purple-400 truncate pr-8" title={topProductThisMonth}>{topProductThisMonth}</p>
                 {maxQty > 0 && <p className="text-xs text-purple-300 mt-1 bg-purple-500/20 inline-block px-2 py-1 rounded-md">{maxQty} sales</p>}
              </div>
            </div>

            {/* 2. REVENUE CHART (LAST 7 DAYS) */}
            <div className="p-8 rounded-3xl border border-white/10 bg-white/5 shadow-xl">
               <h3 className="font-bold text-xl text-indigo-400 mb-8 flex items-center gap-2">
                  <span>📊</span> Revenue Analytics (Last 7 Days)
               </h3>
               <div className="h-64 flex items-end justify-between gap-2 md:gap-4 mt-10">
                  {last7Days.map((day, idx) => {
                     const heightPercentage = (day.amount / maxChartAmount) * 100;
                     return (
                        <div key={idx} className="flex flex-col items-center flex-1 group h-full justify-end">
                           <div className="opacity-0 group-hover:opacity-100 transition-opacity mb-2 text-center relative z-10">
                              <span className="bg-white text-black text-xs font-bold py-1 px-3 rounded-lg shadow-lg">
                                 ${day.amount.toFixed(0)}
                              </span>
                           </div>
                           <div 
                              className="w-full max-w-[50px] bg-indigo-600/30 group-hover:bg-indigo-500 rounded-t-xl transition-all relative border-t border-indigo-500/50 flex items-end justify-center" 
                              style={{ height: `${Math.max(heightPercentage, 2)}%` }}
                           >
                              <div className="absolute bottom-0 w-full bg-gradient-to-t from-indigo-600/80 to-transparent rounded-t-xl" style={{height: '100%'}}></div>
                              <div className="w-1/2 bg-white/20 h-full rounded-t-xl"></div>
                           </div>
                           <span className="text-xs font-bold text-gray-500 mt-3 uppercase tracking-wider">{day.dayName}</span>
                        </div>
                     )
                  })}
               </div>
            </div>

            {/* 3. EXPORT SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 rounded-3xl border border-white/10 bg-white/5 shadow-xl flex justify-between items-center group hover:border-emerald-500/30 transition-colors">
                  <div>
                    <h3 className="font-bold text-lg text-white mb-1">Financial Data</h3>
                    <p className="text-xs text-gray-400">Export all orders to CSV format</p>
                  </div>
                  <button onClick={() => exportToCSV(orders, 'NexusKit_Sales')} className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg flex items-center gap-2">
                     <span>📥</span> Download
                  </button>
                </div>
                <div className="p-8 rounded-3xl border border-white/10 bg-white/5 shadow-xl flex justify-between items-center group hover:border-blue-500/30 transition-colors">
                  <div>
                    <h3 className="font-bold text-lg text-white mb-1">Product Data</h3>
                    <p className="text-xs text-gray-400">Export product catalog to CSV</p>
                  </div>
                  <button onClick={() => exportToCSV(products, 'NexusKit_Products')} className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg flex items-center gap-2">
                     <span>📥</span> Download
                  </button>
                </div>
            </div>
          </div>
        )}

        {/* TEAM */}
        {activeTab === "team" && (
           <div className="space-y-8">
               <div className="p-8 rounded-3xl border border-white/10 bg-white/5 shadow-xl">
                 <h2 className="text-xl font-bold mb-2 text-indigo-400">Add New Team Member</h2>
                 <form onSubmit={handleAddTeamMember} autoComplete="off" className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input required type="email" placeholder="Staff Email" value={newTeamMember.email} onChange={e => setNewTeamMember({...newTeamMember, email: e.target.value})} className="col-span-1 p-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-indigo-500" />
                    <input required type="password" placeholder="Set Password (min 6 chars)" value={newTeamMember.password} onChange={e => setNewTeamMember({...newTeamMember, password: e.target.value})} className="col-span-1 p-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-indigo-500" />
                    <select value={newTeamMember.role} onChange={e => setNewTeamMember({...newTeamMember, role: e.target.value})} className="col-span-1 p-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-indigo-500">
                       <option value="editor">Editor / Staff</option>
                       <option value="manager">Manager</option>
                       <option value="super_admin">Super Admin</option>
                    </select>
                    <button disabled={isProcessingUser} type="submit" className="col-span-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all">Create Account</button>
                 </form>
               </div>
               <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden shadow-xl">
                 <table className="w-full text-left">
                   <thead className="bg-black/40 text-gray-400 text-sm"><tr><th className="p-4">Email</th><th className="p-4">Role</th><th className="p-4">Action</th></tr></thead>
                   <tbody className="divide-y divide-white/5">
                     {teamMembers.map(member => (
                       <tr key={member.id} className="hover:bg-white/5 transition-colors">
                         <td className="p-4 font-bold">{member.email}</td>
                         <td className="p-4"><span className="bg-gray-500/20 text-gray-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{member.role.replace('_', ' ')}</span></td>
                         <td className="p-4 flex gap-4 items-center">
                            {member.email !== currentUser?.email ? <button onClick={() => handleDeleteRecord("team_members", member.id)} className="text-red-500 font-bold hover:text-red-400">Revoke</button> : <span className="text-gray-500 text-sm italic">You</span>}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
           </div>
        )}

        {/* PRODUCTS */}
        {activeTab === "products" && (
          <div className="space-y-6">
            <button onClick={() => { setEditingProductId(null); setNewProduct({name:"", price:"", description:"", product_type: categories && categories.length > 0 ? categories[0].name : "Asset", required_fields:[], subscription_days: 0}); setImageFile(null); setIsProductModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all">+ Add Product</button>
            <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden shadow-xl">
              <table className="w-full text-left"><thead className="bg-black/40 text-gray-400 text-sm"><tr><th className="p-4">Product</th><th className="p-4">Category</th><th className="p-4">Price</th><th className="p-4">Action</th></tr></thead>
                <tbody className="divide-y divide-white/5">
                  {(products || []).map(p => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-bold">{p.name}</td>
                      <td className="p-4"><span className="bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-xs font-bold tracking-wider">{p.product_type}</span></td>
                      <td className="p-4 text-emerald-400 font-bold">${p.price}</td>
                      <td className="p-4 flex gap-4">
                        <button onClick={() => { setEditingProductId(p.id); setNewProduct(p); setIsProductModalOpen(true); }} className="text-indigo-400 font-bold hover:text-indigo-300">Edit</button>
                        <button onClick={() => handleDeleteRecord("products", p.id)} className="text-red-500 font-bold hover:text-red-400">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ORDERS */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            <div className="flex justify-end"><button onClick={() => exportToCSV(orders, 'NexusKit_Orders')} className="bg-emerald-600 hover:bg-emerald-700 px-6 py-2 rounded-xl font-bold text-sm transition-all">Export Orders (CSV)</button></div>
            <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden shadow-xl">
              <table className="w-full text-left"><thead className="bg-black/40 text-gray-400 text-sm"><tr><th className="p-4">ID</th><th className="p-4">Customer</th><th className="p-4">Total</th><th className="p-4">Status</th><th className="p-4">Action</th></tr></thead>
                <tbody className="divide-y divide-white/5">
                  {(orders || []).map(o => (<tr key={o.id} className="hover:bg-white/5"><td className="p-4 font-mono text-xs text-gray-400">#{o.id.toString().slice(0,8)}</td><td className="p-4 font-bold">{o.customer_name}</td><td className="p-4 text-emerald-400 font-bold">${o.total_amount}</td><td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${o.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{o.status}</span></td><td className="p-4">
                    <button onClick={() => { setSelectedOrder(o); setOrderStatus(o.status); setAdminNote(o.admin_note || ""); }} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-bold transition-all">Manage</button>
                  </td></tr>))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PROMOS */}
        {activeTab === "promos" && (
          <div className="space-y-6">
            <button onClick={() => setIsPromoModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/30 transition-all">+ Create Promo Code</button>
            <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden shadow-xl">
              <table className="w-full text-left"><thead className="bg-black/40 text-gray-400 text-sm"><tr><th className="p-4">Code</th><th className="p-4">Discount</th><th className="p-4">Action</th></tr></thead>
                <tbody className="divide-y divide-white/5">{(promoCodes || []).map(p => (<tr key={p.id} className="hover:bg-white/5"><td className="p-4 font-bold tracking-widest text-indigo-400">{p.code}</td><td className="p-4 text-emerald-400 font-bold">{p.discount_percent}% OFF</td><td className="p-4"><button onClick={() => handleDeleteRecord("promo_codes", p.id)} className="text-red-500 font-bold hover:text-red-400">Delete</button></td></tr>))}</tbody>
              </table>
            </div>
          </div>
        )}

        {/* CUSTOMERS */}
        {activeTab === "customers" && (
          <div className="space-y-6">
            <div className="flex justify-end"><button onClick={() => { const cust = orders.filter(o => o.status === 'completed').map(o => ({ Name: o.customer_name, CustomInfo: o.order_note, OrderDate: o.created_at })); exportToCSV(cust, 'NexusKit_Customers'); }} className="bg-emerald-600 hover:bg-emerald-700 px-6 py-2 rounded-xl font-bold text-sm transition-all">Export Customer Data (CSV)</button></div>
            <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden shadow-xl">
              <table className="w-full text-left"><thead className="bg-black/40 text-gray-400 text-sm"><tr><th className="p-4">Customer</th><th className="p-4">Subscription Status</th><th className="p-4">Action</th></tr></thead>
                <tbody className="divide-y divide-white/5">
                  {orders.filter(o => o.status === 'completed').map(order => {
                    const diff = new Date(order.end_date).getTime() - new Date().getTime();
                    const daysLeft = Math.ceil(diff / (1000 * 3600 * 24));
                    return (
                      <tr key={order.id} className="hover:bg-white/5">
                        <td className="p-4 font-bold text-lg">{order.customer_name}</td>
                        <td className="p-4">
                          {order.end_date ? (
                            daysLeft > 5 ? <span className="text-emerald-400 font-bold">{daysLeft} days left</span> : 
                            daysLeft >= 0 ? <span className="text-yellow-400 font-bold bg-yellow-400/10 px-2 py-1 rounded">Expiring ({daysLeft} days)</span> :
                            <span className="text-red-400 font-bold bg-red-400/10 px-2 py-1 rounded">Expired</span>
                          ) : <span className="text-gray-500 italic">No Subscription</span>}
                        </td>
                        <td className="p-4">
                          <button onClick={() => setViewCustomerOrder(order)} className="bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40 px-4 py-2 rounded-lg text-sm font-bold transition-all">View Details</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {activeTab === "settings" && (
          <div className="space-y-12 pb-20">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Category Settings */}
                <div className="p-8 rounded-3xl border border-white/10 bg-white/5 shadow-xl">
                    <h2 className="text-xl font-bold mb-4 text-indigo-400">1. Product Categories (Shop Tabs)</h2>
                    <form onSubmit={handleAddCategory} className="mb-6 bg-black/20 p-4 rounded-xl border border-white/5 space-y-4">
                        <input required type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Add Category (e.g. Subscriptions)" className="w-full p-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-indigo-500" />
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input type="checkbox" checked={newCatHasSub} onChange={e => setNewCatHasSub(e.target.checked)} className="w-5 h-5 rounded text-indigo-600 bg-black/50 border-white/20" />
                            <span className="text-sm text-gray-300 font-medium">Items in this category require a Time Period</span>
                        </label>
                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl font-bold transition-all">Add Category</button>
                    </form>
                    <div className="flex flex-wrap gap-2">{(categories || []).map(cat => (<div key={cat.id} className="bg-black/40 px-4 py-2 rounded-lg flex items-center border border-white/5 shadow-sm"><span className="mr-3">{cat.name} {cat.has_subscription && <span className="text-xs text-indigo-400 font-bold ml-1">(Sub)</span>}</span><button onClick={() => handleDeleteRecord("product_categories", cat.id)} className="text-red-500 font-black hover:text-red-400">×</button></div>))}</div>
                </div>
                
                {/* Info Fields Settings */}
                <div className="p-8 rounded-3xl border border-white/10 bg-white/5 shadow-xl">
                    <h2 className="text-xl font-bold mb-4 text-blue-400">2. Customer Checkout Fields</h2>
                    <form onSubmit={handleAddInfoField} className="flex gap-2 mb-4"><input required type="text" value={newInfoLabel} onChange={e => setNewInfoLabel(e.target.value)} placeholder="e.g. Telegram Username" className="flex-1 p-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-blue-500" /><button type="submit" className="bg-blue-600 hover:bg-blue-700 px-6 rounded-xl font-bold transition-all">Add</button></form>
                    <div className="flex flex-wrap gap-2">{(infoFields || []).map(info => (<div key={info.id} className="bg-black/40 px-4 py-2 rounded-lg flex items-center border border-white/5 shadow-sm"><span className="mr-3">{info.label}</span><button onClick={() => handleDeleteRecord("customer_info_fields", info.id)} className="text-red-500 font-black hover:text-red-400">×</button></div>))}</div>
                </div>

                {/* Payment Methods Settings */}
                <div className="p-8 rounded-3xl border border-white/10 bg-white/5 shadow-xl col-span-1 xl:col-span-2">
                    <h2 className="text-xl font-bold mb-6 text-emerald-400">3. Payment Methods (Dynamic Checkout)</h2>
                    <form onSubmit={handleAddPaymentMethod} className="space-y-4 mb-6 bg-black/20 p-6 rounded-2xl border border-white/5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input required type="text" value={newPayment.provider_name} onChange={e => setNewPayment({...newPayment, provider_name: e.target.value})} placeholder="Provider (e.g. USDT TRC20, KBZPay)" className="w-full p-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-emerald-500" />
                            <input required type="text" value={newPayment.account_details} onChange={e => setNewPayment({...newPayment, account_details: e.target.value})} placeholder="Account Details (Wallet Address / Phone)" className="w-full p-3 rounded-xl bg-black/40 border border-white/10 outline-none font-mono focus:border-emerald-500" />
                        </div>
                        <div><label className="block text-xs text-gray-500 mb-1 font-bold tracking-wider uppercase">Upload QR Code Image (Optional)</label><input type="file" onChange={e => setPmQrFile(e.target.files?.[0] || null)} className="w-full p-2 text-sm bg-black/40 border border-white/10 rounded-xl" /></div>
                        <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-xl font-bold mt-2 transition-all">Add Payment Method</button>
                    </form>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(paymentMethods || []).map(pm => (
                            <div key={pm.id} className="bg-black/40 p-5 rounded-2xl border border-white/5 relative group hover:border-emerald-500/50 transition-colors">
                                <p className="font-bold text-emerald-400 mb-1">{pm.provider_name}</p><p className="text-xs text-white font-mono break-all">{pm.account_details}</p>
                                {pm.qr_url && <img src={pm.qr_url} className="mt-3 w-16 h-16 object-contain bg-white rounded p-1" />}
                                <button onClick={() => handleDeleteRecord("payment_methods", pm.id)} className="absolute top-4 right-4 text-red-500 font-bold bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded-md text-xs transition-colors opacity-0 group-hover:opacity-100">Delete</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* VISUAL CMS FORM */}
            <form onSubmit={handleSaveSettings} className="space-y-8 pt-8 border-t border-white/10">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[#111] p-6 rounded-3xl border border-white/10 sticky top-0 z-10 shadow-2xl">
                    <div><h2 className="text-2xl font-bold text-white">Visual CMS</h2><p className="text-gray-400 text-sm mt-1">Customize website text, links, and images completely.</p></div>
                    <button type="submit" disabled={savingSettings} className="w-full md:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-10 py-4 rounded-xl font-bold shadow-lg transition-all">{savingSettings ? "Saving..." : "Save Visual Changes"}</button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    <div className="p-8 rounded-3xl border border-white/10 bg-white/5 space-y-4 shadow-xl">
                        <h3 className="text-xl font-bold text-indigo-400 border-b border-white/10 pb-4">Home & Shop Pages</h3>
                        <label className="block text-sm text-gray-400">Hero Title</label><input type="text" value={settings.hero_title || ""} onChange={e => setSettings({...settings, hero_title: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-indigo-500" />
                        <label className="block text-sm text-gray-400">Hero Subtitle</label><textarea rows={2} value={settings.hero_subtitle || ""} onChange={e => setSettings({...settings, hero_subtitle: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 resize-none outline-none focus:border-indigo-500" />
                        <label className="block text-sm text-gray-400">Featured Products Title</label><input type="text" value={settings.home_featured_title || ""} onChange={e => setSettings({...settings, home_featured_title: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-indigo-500" />
                        <label className="block text-sm text-gray-400">Explore Button Text</label><input type="text" value={settings.home_explore_button || ""} onChange={e => setSettings({...settings, home_explore_button: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-indigo-500" />
                        <label className="block text-sm text-gray-400 pt-4 border-t border-white/10">Shop Page Title</label><input type="text" value={settings.shop_title || ""} onChange={e => setSettings({...settings, shop_title: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-indigo-500" />
                        <label className="block text-sm text-gray-400">Shop Page Subtitle</label><textarea rows={2} value={settings.shop_subtitle || ""} onChange={e => setSettings({...settings, shop_subtitle: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 resize-none outline-none focus:border-indigo-500" />
                        <label className="block text-sm text-gray-400 text-yellow-400">Add to Cart Button Text</label><input type="text" value={settings.add_to_cart_button || ""} onChange={e => setSettings({...settings, add_to_cart_button: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-yellow-500" />
                    </div>
                    
                    <div className="p-8 rounded-3xl border border-white/10 bg-white/5 space-y-4 shadow-xl">
                        <h3 className="text-xl font-bold text-purple-400 border-b border-white/10 pb-4">About Page Texts</h3>
                        <input type="text" placeholder="Badge (e.g. OUR STORY)" value={settings.about_badge || ""} onChange={e => setSettings({...settings, about_badge: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-purple-500" />
                        <input type="text" placeholder="Title (e.g. About *NexusKit*)" value={settings.about_title || ""} onChange={e => setSettings({...settings, about_title: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-purple-500" />
                        <textarea rows={3} placeholder="Full Description..." value={settings.about_text || ""} onChange={e => setSettings({...settings, about_text: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 resize-none outline-none focus:border-purple-500" />
                        <div className="grid grid-cols-2 gap-4">
                           <input type="text" placeholder="Stat 1 Value (e.g. 99%)" value={settings.about_stat_1_val || ""} onChange={e => setSettings({...settings, about_stat_1_val: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-sm outline-none focus:border-purple-500" />
                           <input type="text" placeholder="Stat 1 Text" value={settings.about_stat_1_text || ""} onChange={e => setSettings({...settings, about_stat_1_text: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-sm outline-none focus:border-purple-500" />
                           <input type="text" placeholder="Stat 2 Value (e.g. 24/7)" value={settings.about_stat_2_val || ""} onChange={e => setSettings({...settings, about_stat_2_val: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-sm outline-none focus:border-purple-500" />
                           <input type="text" placeholder="Stat 2 Text" value={settings.about_stat_2_text || ""} onChange={e => setSettings({...settings, about_stat_2_text: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-sm outline-none focus:border-purple-500" />
                        </div>
                        <input type="text" placeholder="Floating Box Title" value={settings.about_floating_title || ""} onChange={e => setSettings({...settings, about_floating_title: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-purple-500" />
                        <input type="text" placeholder="Floating Box Text" value={settings.about_floating_text || ""} onChange={e => setSettings({...settings, about_floating_text: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-purple-500" />
                        <input type="text" placeholder="Button Text" value={settings.about_button_text || ""} onChange={e => setSettings({...settings, about_button_text: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-purple-500" />
                        <div><label className="block text-xs text-gray-400 mb-1 font-bold uppercase tracking-wider">Change About Image</label><input type="file" onChange={e => setAboutImageFile(e.target.files?.[0] || null)} className="w-full p-2 bg-black/40 border border-white/10 rounded-xl" /></div>
                    </div>

                    <div className="p-8 rounded-3xl border border-white/10 bg-white/5 space-y-4 shadow-xl">
                        <h3 className="text-xl font-bold text-emerald-400 border-b border-white/10 pb-4">Contact Page Texts</h3>
                        <label className="block text-sm text-gray-400">Contact Page Main Title</label><input type="text" value={settings.contact_page_title || ""} onChange={e => setSettings({...settings, contact_page_title: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-emerald-500" />
                        <label className="block text-sm text-gray-400">Contact Page Subtitle</label><textarea rows={2} value={settings.contact_page_subtitle || ""} onChange={e => setSettings({...settings, contact_page_subtitle: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 resize-none outline-none focus:border-emerald-500" />
                        <label className="block text-sm text-gray-400 mt-4 border-t border-white/10 pt-4">Contact Status Title</label><input type="text" value={settings.contact_status_title || ""} onChange={e => setSettings({...settings, contact_status_title: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-emerald-500" />
                        <label className="block text-sm text-gray-400">Contact Status Text</label><textarea rows={2} value={settings.contact_status_text || ""} onChange={e => setSettings({...settings, contact_status_text: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 resize-none outline-none focus:border-emerald-500" />
                    </div>

                    <div className="p-8 rounded-3xl border border-white/10 bg-white/5 space-y-4 shadow-xl">
                        <h3 className="text-xl font-bold text-orange-400 border-b border-white/10 pb-4">Cart & Checkout Pages</h3>
                        <label className="block text-sm text-gray-400">Cart Title</label><input type="text" value={settings.cart_title || ""} onChange={e => setSettings({...settings, cart_title: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-orange-500" />
                        <label className="block text-sm text-gray-400">Order Summary Title</label><input type="text" value={settings.cart_order_summary || ""} onChange={e => setSettings({...settings, cart_order_summary: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-orange-500" />
                        <label className="block text-sm text-gray-400">Checkout Button Text</label><input type="text" value={settings.cart_checkout_button || ""} onChange={e => setSettings({...settings, cart_checkout_button: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-orange-500" />
                        <label className="block text-sm text-gray-400 mt-4 border-t border-white/10 pt-4">Order Success Title</label><input type="text" value={settings.order_success_title || ""} onChange={e => setSettings({...settings, order_success_title: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-orange-500" />
                        <label className="block text-sm text-gray-400">Order Success Message</label><textarea rows={2} value={settings.order_success_message || ""} onChange={e => setSettings({...settings, order_success_message: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 resize-none outline-none focus:border-orange-500" />
                    </div>

                    <div className="p-8 rounded-3xl border border-white/10 bg-white/5 space-y-4 col-span-1 lg:col-span-2 shadow-xl">
                        <h3 className="text-xl font-bold text-blue-400 border-b border-white/10 pb-4">General, Footer & Social Links</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div><label className="block text-sm text-gray-400 mb-1">Instagram URL</label><input type="text" value={settings.instagram_url || ""} onChange={e => setSettings({...settings, instagram_url: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-blue-500" /></div>
                            <div><label className="block text-sm text-gray-400 mb-1">Telegram URL</label><input type="text" value={settings.telegram_url || ""} onChange={e => setSettings({...settings, telegram_url: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-blue-500" /></div>
                            <div><label className="block text-sm text-gray-400 mb-1">Facebook URL</label><input type="text" value={settings.facebook_url || ""} onChange={e => setSettings({...settings, facebook_url: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-blue-500" /></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                           <div><label className="block text-sm text-gray-400 mb-1">Location / Address</label><input type="text" value={settings.location || ""} onChange={e => setSettings({...settings, location: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-blue-500" /></div>
                           <div><label className="block text-sm text-gray-400 mb-1">Footer Copyright Text</label><input type="text" value={settings.footer_text || ""} onChange={e => setSettings({...settings, footer_text: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-blue-500" /></div>
                           <div><label className="block text-sm text-gray-400 mb-1">Contact Email</label><input type="email" value={settings.contact_email || ""} onChange={e => setSettings({...settings, contact_email: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-blue-500" /></div>
                           <div><label className="block text-sm text-gray-400 mb-1">Contact Phone</label><input type="text" value={settings.contact_phone || ""} onChange={e => setSettings({...settings, contact_phone: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-blue-500" /></div>
                           <div className="col-span-1 md:col-span-2"><label className="block text-sm text-gray-400 mb-1">Footer Description Text</label><textarea rows={2} value={settings.footer_description || ""} onChange={e => setSettings({...settings, footer_description: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 resize-none outline-none focus:border-blue-500" /></div>
                        </div>
                    </div>
                </div>
            </form>
          </div>
        )}
      </main>

      {/* --- MODALS SECTION --- */}
      
      {/* 1. ADD PRODUCT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <form onSubmit={handleSaveProduct} className="bg-gray-900 p-8 rounded-3xl w-full max-w-xl border border-white/10 shadow-2xl my-8">
            <h2 className="text-2xl font-bold mb-6 text-indigo-400 border-b border-white/10 pb-4">Product Form</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><label className="block text-sm text-gray-400 mb-1">Name</label><input required type="text" value={newProduct.name || ""} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-3 rounded-xl bg-black/50 border border-white/10 outline-none focus:border-indigo-500" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Price ($)</label><input required type="number" step="0.01" value={newProduct.price || ""} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full p-3 rounded-xl bg-black/50 border border-white/10 outline-none focus:border-indigo-500" /></div>
            </div>
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-1">Select Category</label>
              <select value={newProduct.product_type || ""} onChange={e => setNewProduct({...newProduct, product_type: e.target.value})} className="w-full p-3 rounded-xl bg-black/50 border border-white/10 outline-none focus:border-indigo-500 cursor-pointer">
                {(categories || []).length === 0 && <option value="Asset">Asset (Default)</option>}
                {(categories || []).map(cat => <option key={cat.id} value={cat.name}>{cat.name} {cat.has_subscription ? "(Requires Time Period)" : ""}</option>)}
              </select>
            </div>
            {categories.find(c => c.name === (newProduct.product_type || categories[0]?.name))?.has_subscription && (
              <div className="mb-6 bg-indigo-500/10 border border-indigo-500/30 p-4 rounded-xl">
                 <label className="block text-sm font-bold text-indigo-400 mb-2">Subscription Period (Days)</label>
                 <input required type="number" min="1" value={newProduct.subscription_days || ""} onChange={e => setNewProduct({...newProduct, subscription_days: e.target.value})} className="w-full p-3 rounded-xl bg-black/50 border border-white/10 outline-none focus:border-indigo-500" />
                 <p className="text-xs text-gray-400 mt-2">Enter how many days this subscription lasts (e.g., 30 for 1 month).</p>
              </div>
            )}
            <div className="bg-white/5 p-5 rounded-2xl mb-6 border border-white/10">
              <label className="block text-sm font-bold mb-3 text-emerald-400">Required Info Fields for Checkout</label>
              {(infoFields || []).length === 0 ? <p className="text-xs text-gray-500">No custom fields created in Settings.</p> : (
                <div className="space-y-3">
                  {(infoFields || []).map(info => (
                    <label key={info.id} className="flex items-center space-x-3 cursor-pointer">
                      <input type="checkbox" checked={(newProduct.required_fields || []).includes(info.label)} onChange={() => handleToggleRequiredField(info.label)} className="w-5 h-5 rounded bg-black border-white/20 focus:ring-indigo-500" />
                      <span className="text-sm font-medium">{info.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <textarea placeholder="Description" rows={3} value={newProduct.description || ""} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="w-full p-3 rounded-xl bg-black/50 border border-white/10 mb-4 resize-none outline-none focus:border-indigo-500" />
            <input type="file" onChange={e => setImageFile(e.target.files?.[0] || null)} className="w-full p-2 rounded-xl bg-black/50 border border-white/10 mb-6 text-sm" />
            <div className="flex justify-end space-x-4 border-t border-white/10 pt-4">
              <button type="button" onClick={() => setIsProductModalOpen(false)} className="text-gray-400 font-bold hover:text-white transition-colors">Cancel</button>
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 px-8 py-3 rounded-xl font-bold shadow-lg transition-all">Save Product</button>
            </div>
          </form>
        </div>
      )}

      {/* 2. CREATE PROMO MODAL */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <form onSubmit={handleAddPromo} className="bg-gray-900 p-8 rounded-3xl w-full max-w-sm border border-white/10 shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 text-emerald-400 border-b border-white/10 pb-4">Create Promo Code</h2>
            <div className="space-y-4">
               <input required type="text" placeholder="CODE (e.g. SUMMER20)" value={newPromo.code} onChange={e => setNewPromo({...newPromo, code: e.target.value})} className="w-full p-3 rounded-xl bg-black/50 border border-white/10 outline-none focus:border-emerald-500 uppercase tracking-widest" />
               <input required type="number" min="1" max="100" placeholder="Discount %" value={newPromo.discount_percent} onChange={e => setNewPromo({...newPromo, discount_percent: e.target.value})} className="w-full p-3 rounded-xl bg-black/50 border border-white/10 outline-none focus:border-emerald-500" />
            </div>
            <div className="flex justify-end space-x-4 pt-6 mt-6 border-t border-white/10">
              <button type="button" onClick={() => setIsPromoModalOpen(false)} className="text-gray-400 font-bold hover:text-white transition-colors">Cancel</button>
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 px-6 py-2 rounded-xl font-bold shadow-lg transition-all">Create</button>
            </div>
          </form>
        </div>
      )}

      {/* 3. EDIT TEAM MEMBER MODAL */}
      {editingTeamMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <form onSubmit={handleUpdateTeamMember} autoComplete="off" className="bg-gray-900 p-8 rounded-3xl w-full max-w-md border border-white/10 shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 text-indigo-400 border-b border-white/10 pb-4">Edit Team Member</h2>
            <div className="space-y-4">
               <div>
                 <label className="block text-sm text-gray-400 mb-1">Email</label>
                 <input type="text" disabled value={editingTeamMember.email} className="w-full p-3 rounded-xl bg-black/60 text-gray-500 border border-white/10 cursor-not-allowed" />
               </div>
               <div>
                 <label className="block text-sm text-gray-400 mb-1">Role</label>
                 <select value={editingTeamMember.role} onChange={e => setEditingTeamMember({...editingTeamMember, role: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 outline-none focus:border-indigo-500 cursor-pointer">
                    <option value="editor">Editor / Staff</option>
                    <option value="manager">Manager</option>
                    <option value="super_admin">Super Admin</option>
                 </select>
               </div>
            </div>
            <div className="flex justify-end space-x-4 pt-6 mt-6 border-t border-white/10">
              <button type="button" onClick={() => setEditingTeamMember(null)} className="text-gray-400 font-bold hover:text-white transition-colors">Cancel</button>
              <button disabled={isProcessingUser} type="submit" className="bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded-xl font-bold shadow-lg transition-all">
                {isProcessingUser ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. CUSTOMER DETAILS MODAL */}
      {viewCustomerOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-700 rounded-3xl w-full max-w-2xl p-8 shadow-2xl my-8">
              <h3 className="text-2xl font-bold text-white mb-2">Customer Details</h3>
              <p className="text-sm text-emerald-400 font-mono mb-6 pb-4 border-b border-white/10">Order #{viewCustomerOrder.id.toString().slice(0,8)}</p>
              <div className="space-y-6">
                 <div className="bg-black/40 p-5 rounded-2xl border border-white/5">
                    <h4 className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-3">Profile Info</h4>
                    <p className="text-lg font-bold text-white mb-1">{viewCustomerOrder.customer_name}</p>
                    <p className="text-sm text-gray-400">Total Paid: <span className="text-emerald-400 font-bold">${viewCustomerOrder.total_amount}</span></p>
                 </div>
                 {viewCustomerOrder.order_note && (
                   <div className="bg-blue-500/10 p-5 rounded-2xl border border-blue-500/20">
                      <h4 className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-3">Custom Data Provided</h4>
                      <div className="space-y-2">
                        {viewCustomerOrder.order_note.split('|').map((note: string, idx: number) => (
                           <p key={idx} className="text-sm text-gray-200 bg-black/40 p-2 rounded-lg font-mono border border-white/5">{note.trim()}</p>
                        ))}
                      </div>
                   </div>
                 )}
                 <div className="bg-black/40 p-5 rounded-2xl border border-white/5">
                    <h4 className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-3">Purchased Products</h4>
                    <div className="space-y-3">
                      {(viewCustomerOrder.items || []).map((item: any, idx: number) => (
                         <div key={idx} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                            <div>
                               <p className="font-bold text-sm text-white">{item.name}</p>
                               <p className="text-xs text-gray-500">Qty: {item.quantity || 1} • {item.product_type}</p>
                            </div>
                            <span className="text-emerald-400 font-bold text-sm">${item.price}</span>
                         </div>
                      ))}
                    </div>
                 </div>
              </div>
              <div className="flex justify-end pt-6 mt-6 border-t border-white/10">
                <button onClick={() => setViewCustomerOrder(null)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold transition-all">Close</button>
              </div>
          </div>
        </div>
      )}

      {/* 5. 🌟 SECURE ORDER MANAGEMENT MODAL 🌟 */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#111] border border-white/10 rounded-3xl w-full max-w-xl p-8 shadow-2xl relative my-8">
              
              <button onClick={() => setSelectedOrder(null)} className="absolute top-6 right-6 text-gray-500 hover:text-white font-black text-xl transition-colors">✕</button>
              
              <h3 className="text-xl font-bold text-white mb-2">Manage Order</h3>
              <p className="text-sm text-indigo-400 font-mono mb-6 pb-4 border-b border-white/10">#{selectedOrder.id.toString().slice(0,8)} • {selectedOrder.customer_name}</p>

              <div className="mb-6">
                  <p className="text-sm text-gray-400 mb-2 font-bold uppercase tracking-wider">Payment Slip</p>
                  {selectedOrder.slip_url ? (
                    <a href={selectedOrder.slip_url} target="_blank" rel="noreferrer">
                      <img src={selectedOrder.slip_url} alt="Slip" className="w-full max-h-48 object-contain rounded-xl border border-white/10 bg-black/40 hover:opacity-80 transition-opacity" />
                    </a>
                  ) : (
                    <div className="p-6 text-center text-gray-500 border border-white/10 rounded-xl bg-black/40 text-sm">No Slip Uploaded</div>
                  )}
              </div>

              {/* 🌟 လျှို့ဝှက်စာသား ထည့်ရန် 🌟 */}
              <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl">
                 <label className="block text-sm text-emerald-400 mb-2 font-bold flex items-center gap-2">
                    <span>🔐</span> Secure Credentials / Admin Note
                 </label>
                 <textarea 
                    rows={3} 
                    placeholder="Enter Email / Password or special instructions for the customer here... (This will securely appear in their My Account portal)" 
                    value={adminNote} 
                    onChange={e => setAdminNote(e.target.value)} 
                    className="w-full p-4 rounded-xl bg-black/60 border border-emerald-500/30 text-emerald-50 font-mono text-sm outline-none focus:border-emerald-500 resize-none"
                 />
                 <p className="text-xs text-gray-400 mt-2 italic">Only visible to this specific customer.</p>
              </div>

              <div className="mb-8">
                  <label className="block text-sm text-gray-400 mb-2 font-bold uppercase tracking-wider">Order Status</label>
                  <select value={orderStatus} onChange={e => setOrderStatus(e.target.value)} className="w-full p-4 rounded-xl bg-black/50 border border-white/10 outline-none focus:border-indigo-500 font-bold cursor-pointer">
                    <option value="pending">🟡 Pending Verification</option>
                    <option value="completed">🟢 Completed & Send Credentials</option>
                    <option value="cancelled">🔴 Cancelled</option>
                  </select>
              </div>

              <div className="flex justify-end space-x-4 border-t border-white/10 pt-6">
                <button onClick={() => setSelectedOrder(null)} className="text-gray-400 font-bold hover:text-white transition-colors">Cancel</button>
                <button onClick={async () => {
                    const updates: any = { 
                        status: orderStatus,
                        admin_note: adminNote
                    };
                    
                    if (orderStatus === "completed" && selectedOrder.status !== "completed") {
                        let maxDays = 0;
                        selectedOrder.items.forEach((item: any) => { if (item.subscription_days && item.subscription_days > maxDays) maxDays = item.subscription_days; });
                        if (maxDays > 0) {
                            updates.start_date = new Date().toISOString();
                            let endDate = new Date(); endDate.setDate(endDate.getDate() + maxDays);
                            updates.end_date = endDate.toISOString();
                        }
                    }
                    await supabase.from("orders").update(updates).eq("id", selectedOrder.id);
                    setSelectedOrder(null); fetchData(false); alert("Order status and credentials updated securely!");
                }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all">
                  Approve & Save
                </button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}