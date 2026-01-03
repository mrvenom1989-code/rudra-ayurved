"use client";

import { useState, useEffect, Suspense, useRef } from "react"; 
import { useSearchParams, useRouter } from "next/navigation"; 
import { 
  Pill, Search, RefreshCw, Package, Clock, CheckCircle, 
  Loader2, Plus, Trash2, FileText, History, Printer, Calendar,
  ShoppingCart, X, BadgePercent, User, AlertTriangle, Stethoscope
} from "lucide-react";
import { 
  getPharmacyInventory, updateMedicine, getPharmacyQueue, 
  dispenseMedicine, createMedicine, deleteMedicine,
  getDispensedHistory, searchPatients, savePrescription 
} from "@/app/actions";
import StaffHeader from "@/app/components/StaffHeader"; 
import { generateBill } from "@/app/components/BillGenerator"; 

// --- INNER COMPONENT ---
function PharmacyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'queue' | 'inventory' | 'history'>('queue');
  
  // Data States
  const [inventory, setInventory] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [historyResults, setHistoryResults] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [inventorySearch, setInventorySearch] = useState("");
  
  // History Filters
  const [historySearch, setHistorySearch] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" }); 
  const [isSearchingHistory, setIsSearchingHistory] = useState(false);

  // Edit States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ 
      stock: "", price: "", minStock: "", mfgDate: "", expDate: "", type: "" 
  }); 

  // Add Medicine Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMed, setNewMed] = useState({ 
    name: "", type: "Tablet", stock: "0", price: "0", minStock: "10", mfgDate: "", expDate: ""
  });

  // Dispensing & Discount States
  const [dispenseQtys, setDispenseQtys] = useState<{[key: string]: string}>({});
  const [discounts, setDiscounts] = useState<{[key: string]: string}>({});

  // Direct Sale State
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [walkInCart, setWalkInCart] = useState<any[]>([]);
  const [walkInSearch, setWalkInSearch] = useState("");
  const [walkInDetails, setWalkInDetails] = useState({ patientName: "", phone: "", patientId: "", discount: "" });
  const [patientSuggestions, setPatientSuggestions] = useState<any[]>([]);
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const patientSearchRef = useRef<HTMLDivElement>(null);

  // --- 1. LISTEN FOR URL PARAMS ---
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['queue', 'inventory', 'history'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  const switchTab = (tab: 'queue' | 'inventory' | 'history') => {
    setActiveTab(tab);
    router.replace(`/pharmacy?tab=${tab}`);
  };

  // --- 2. LOAD DATA ---
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invData, queueData] = await Promise.all([
        getPharmacyInventory(), 
        getPharmacyQueue()
      ]);
      setInventory(invData);
      setQueue(queueData);
      
      const initialQtys: {[key: string]: string} = {};
      queueData.forEach((q: any) => {
        q.prescriptions.forEach((p: any) => {
          p.items.forEach((i: any) => {
             initialQtys[i.id] = i.dispensedQty ? i.dispensedQty.toString() : "1"; 
          });
        });
      });
      setDispenseQtys(initialQtys);
    } catch (e) {
      console.error("Error loading pharmacy data", e);
    } finally {
      setLoading(false);
    }
  };

  // --- 3. HISTORY FETCHING ---
  useEffect(() => {
    if (activeTab === 'history') {
        const delayDebounce = setTimeout(async () => {
            setIsSearchingHistory(true);
            const results = await getDispensedHistory(historySearch, dateRange.start, dateRange.end);
            setHistoryResults(results);
            setIsSearchingHistory(false);
        }, 500);
        return () => clearTimeout(delayDebounce);
    }
  }, [historySearch, dateRange, activeTab]); 

  // --- 4. BILLING GENERATORS ---
  const printConsultationBill = (consult: any) => {
     const fee = 500 - (consult.discount || 0);
     const items = [{ name: "Consultation Charge", qty: 1, amount: fee }];
     const dateStr = new Date(consult.createdAt).toISOString().slice(0,10).replace(/-/g, "");
     generateBill({
       billNo: `OPD-${dateStr}-${consult.id.slice(-4).toUpperCase()}`,
       date: new Date(consult.createdAt).toLocaleDateString(),
       patientName: consult.patient.name,
       patientId: consult.patient.readableId || consult.patient.id.slice(0,6),
       appointmentId: consult.appointment?.readableId || "WALK-IN",
       doctorName: consult.doctorName || "Dr. Chirag Raval",
       items
    });
  };

  const printPharmacyBill = (consult: any, isReprint = false) => {
    let subTotal = 0;
    const items = consult.prescriptions[0]?.items.map((item: any) => {
       const qty = isReprint 
          ? (item.dispensedQty || 1) 
          : parseInt(dispenseQtys[item.id] || (item.dispensedQty ? item.dispensedQty.toString() : "1"));
       const medInfo = inventory.find(i => i.name === item.medicine?.name);
       const unitPrice = medInfo?.price || 0;
       const lineTotal = unitPrice * qty;
       subTotal += lineTotal;
       return { name: `${item.medicine?.name} (${item.unit || '-'})`, qty, amount: lineTotal };
    }) || [];

    if(items.length === 0) return alert("No items to bill");

    const discountPercent = parseFloat(discounts[consult.id] || "0");
    if (discountPercent > 0) {
        const discountAmount = (subTotal * discountPercent) / 100;
        items.push({ name: `PHARMACY DISCOUNT (${discountPercent}%)`, qty: 1, amount: -discountAmount });
    }

    const dateStr = new Date(consult.createdAt).toISOString().slice(0,10).replace(/-/g, "");
    generateBill({
       billNo: `PH-${dateStr}-${consult.id.slice(-4).toUpperCase()}`,
       date: new Date(consult.createdAt).toLocaleDateString(),
       patientName: consult.patient.name,
       patientId: consult.patient.readableId,
       appointmentId: consult.appointment?.readableId || "WALK-IN",
       doctorName: consult.doctorName,
       items
    });
  };

  // --- 5. ACTIONS ---
  const handleQtyChange = (itemId: string, val: string) => setDispenseQtys(prev => ({...prev, [itemId]: val}));
  const handleDiscountChange = (consultId: string, val: string) => setDiscounts(prev => ({...prev, [consultId]: val}));

  const handleDispenseItem = async (itemId: string) => {
    const qty = parseInt(dispenseQtys[itemId]) || 1;
    if(qty <= 0) return alert("Invalid quantity");
    const result = await dispenseMedicine(itemId, qty);
    if (result.success) {
      setQueue(prev => prev.map(c => ({
        ...c, prescriptions: c.prescriptions.map((p: any) => ({
          ...p, items: p.items.map((i: any) => i.id === itemId ? { ...i, status: 'DISPENSED', dispensedQty: qty } : i)
        }))
      })));
      setInventory(await getPharmacyInventory());
    }
  };

  const handleDispenseAll = async (items: any[]) => {
    if(!confirm("Dispense all?")) return;
    for (const item of items) { if (item.status === 'PENDING') await handleDispenseItem(item.id); }
  };

  // --- 6. INVENTORY CRUD ---
  const handleAddNew = async () => {
    await createMedicine(newMed);
    setIsAddModalOpen(false);
    setNewMed({ name: "", type: "Tablet", stock: "0", price: "0", minStock: "10", mfgDate: "", expDate: "" });
    loadData();
  };

  const handleDelete = async (id: string) => {
    if(confirm("Delete?")) {
      await deleteMedicine(id);
      loadData();
    }
  };

  const handleEdit = (med: any) => {
    setEditingId(med.id);
    setEditForm({ 
        stock: med.stock.toString(), 
        price: med.price.toString(),
        minStock: (med.minStock || 10).toString(),
        mfgDate: med.mfgDate ? new Date(med.mfgDate).toISOString().split('T')[0] : "",
        expDate: med.expDate ? new Date(med.expDate).toISOString().split('T')[0] : "",
        type: med.type || "Tablet" 
    });
  };

  const saveEdit = async (id: string) => {
    await updateMedicine(id, editForm);
    setEditingId(null);
    loadData();
  };

  // --- 7. DIRECT SALE ---
  useEffect(() => {
    const t = setTimeout(async () => {
      if (walkInDetails.patientName.length > 1 && !walkInDetails.patientId) {
        setPatientSuggestions(await searchPatients(walkInDetails.patientName));
        setShowPatientSearch(true);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [walkInDetails.patientName]);

  const selectPatient = (p: any) => {
    setWalkInDetails({ ...walkInDetails, patientName: p.name, phone: p.phone, patientId: p.id });
    setShowPatientSearch(false);
  };

  const addToWalkInCart = (med: any) => { if (!walkInCart.find(i => i.id === med.id)) setWalkInCart([...walkInCart, { ...med, qty: 1 }]); };
  const removeFromWalkInCart = (idx: number) => { const n=[...walkInCart]; n.splice(idx,1); setWalkInCart(n); };
  const updateWalkInQty = (idx: number, val: string) => { const n=[...walkInCart]; n[idx].qty=parseInt(val)||1; setWalkInCart(n); };

  const handleWalkInCheckout = async () => {
     if(!walkInDetails.patientName) return alert("Patient Name Required");
     const visitData = { doctorName: "Pharmacy", diagnosis: "Direct Sale", prescriptions: walkInCart.map(i => ({ medicineId: i.id, dosage: "-", unit: i.type, duration: "N/A", instruction: "Direct Sale" })) };
     if(walkInDetails.patientId) await savePrescription(walkInDetails.patientId, visitData);
     
     for (const i of walkInCart) await updateMedicine(i.id, { stock: (i.stock - i.qty).toString(), price: i.price.toString() });
     
     // ✅ NO PRINT HERE (As Requested)
     alert("Sale Completed! You can print bills from the Live Queue if needed.");
     
     setIsWalkInModalOpen(false);
     setWalkInCart([]);
     loadData();
  };

  const filteredInventory = inventory.filter(m => m.name.toLowerCase().includes(inventorySearch.toLowerCase()));
  const filteredWalkInInventory = inventory.filter(m => m.name.toLowerCase().includes(walkInSearch.toLowerCase())).slice(0, 5); 

  return (
    <div className="h-screen bg-[#FDFBF7] flex flex-col font-sans text-neutral-800 overflow-hidden">
      <StaffHeader />
      
      {/* TOOLBAR */}
      <div className="bg-white border-b px-8 py-4 flex justify-between items-center shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
           <div className="bg-[#1e3a29] text-white p-2 rounded-lg"><Pill size={24} /></div>
           <h1 className="text-xl font-serif font-bold text-[#1e3a29]">Pharmacy Dashboard</h1>
        </div>
        <div className="flex gap-4">
            <button onClick={() => setIsWalkInModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md transition">
                <ShoppingCart size={16}/> Direct Sale
            </button>
            <div className="flex bg-gray-100 p-1 rounded-lg">
                <button onClick={() => switchTab('queue')} className={`px-4 py-2 text-sm font-bold rounded-md transition flex items-center gap-2 ${activeTab === 'queue' ? 'bg-white shadow text-[#1e3a29]' : 'text-gray-500'}`}>
                    <Clock size={16}/> Live Queue
                    {queue.some(q => q.prescriptions.some((p:any) => p.items.some((i:any) => i.status === 'PENDING'))) && <span className="bg-red-500 w-2 h-2 rounded-full animate-pulse"></span>}
                </button>
                <button onClick={() => switchTab('history')} className={`px-4 py-2 text-sm font-bold rounded-md transition flex items-center gap-2 ${activeTab === 'history' ? 'bg-white shadow text-[#1e3a29]' : 'text-gray-500'}`}>
                    <History size={16}/> History
                </button>
                <button onClick={() => switchTab('inventory')} className={`px-4 py-2 text-sm font-bold rounded-md transition flex items-center gap-2 ${activeTab === 'inventory' ? 'bg-white shadow text-[#1e3a29]' : 'text-gray-500'}`}>
                    <Package size={16}/> Inventory
                </button>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {loading ? <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-[#c5a059]" size={40}/></div> : (
          <>
            {/* --- TAB 1: LIVE QUEUE --- */}
            {activeTab === 'queue' && (
              <div className="max-w-6xl mx-auto space-y-4">
                {queue.length === 0 ? <div className="text-center py-20 text-gray-400 border-2 border-dashed rounded-xl">No active patients.</div> : queue.map((consult) => {
                     const fee = 500 - (consult.discount || 0);
                     return (
                       <div key={consult.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition">
                         <div className="flex justify-between items-start mb-4">
                           <div>
                             <div className="flex items-center gap-3">
                               <h3 className="text-lg font-bold text-[#1e3a29]">{consult.patient.name}</h3>
                               <span className={`text-[10px] px-2 py-0.5 rounded font-bold border flex items-center gap-1 ${fee > 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                  <Stethoscope size={10}/> Consultation: {fee > 0 ? `₹${fee}` : "FREE"}
                               </span>
                             </div>
                             <p className="text-xs text-gray-500 mt-1">Prescribed by {consult.doctorName} • {new Date(consult.createdAt).toLocaleTimeString()}</p>
                             <div className="flex gap-2 mt-2">
                                <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500 font-mono">PID: {consult.patient.readableId || "-"}</span>
                                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-mono">APP: {consult.appointment?.readableId || "WALK-IN"}</span>
                             </div>
                           </div>
                           <div className="flex gap-2 items-center">
                             <div className="flex items-center gap-1 bg-gray-50 border rounded px-2 py-1">
                                <BadgePercent size={14} className="text-gray-400"/>
                                <input type="number" placeholder="Disc %" className="w-16 text-xs bg-transparent outline-none" value={discounts[consult.id] || ""} onChange={(e) => handleDiscountChange(consult.id, e.target.value)} />
                             </div>
                             <button onClick={() => printConsultationBill(consult)} className="bg-blue-50 border border-blue-200 text-blue-700 font-bold px-3 py-2 rounded-lg text-xs hover:bg-blue-100 flex items-center gap-1"><FileText size={14}/> Consult</button>
                             <button onClick={() => printPharmacyBill(consult, false)} className="bg-white border border-[#1e3a29] text-[#1e3a29] font-bold px-3 py-2 rounded-lg text-xs hover:bg-gray-50 flex items-center gap-1"><FileText size={14}/> Meds</button>
                             <button onClick={() => handleDispenseAll(consult.prescriptions[0]?.items || [])} className="bg-[#1e3a29] text-white font-bold px-4 py-2 rounded-lg text-xs shadow hover:bg-[#162b1e] flex items-center gap-2"><CheckCircle size={14}/> Dispense All</button>
                           </div>
                         </div>
                         <div className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
                           <table className="w-full text-sm">
                             <thead className="bg-gray-100 text-xs uppercase text-gray-500 text-left"><tr><th className="p-3">Medicine</th><th className="p-3">Info</th><th className="p-3">Qty</th><th className="p-3 text-right">Status</th></tr></thead>
                             <tbody className="divide-y divide-gray-200">
                               {consult.prescriptions[0]?.items.map((item: any) => (
                                 <tr key={item.id} className={item.status === 'DISPENSED' ? 'bg-green-50' : ''}>
                                   <td className="p-3 font-medium text-[#1e3a29]">{item.medicine?.name}</td>
                                   <td className="p-3 font-mono text-xs">{item.dosage}<div className="text-[10px] text-gray-500">{item.instruction}</div></td>
                                   <td className="p-3 text-center">{item.status === 'PENDING' ? <input type="number" className="w-16 p-1 border rounded text-center" value={dispenseQtys[item.id] || "1"} onChange={(e) => handleQtyChange(item.id, e.target.value)} /> : <span className="font-bold">{item.dispensedQty}</span>}</td>
                                   <td className="p-3 text-right">{item.status === 'DISPENSED' ? <span className="text-green-700 font-bold text-xs">Dispensed</span> : <button onClick={() => handleDispenseItem(item.id)} className="text-[#c5a059] font-bold text-xs hover:underline">Dispense</button>}</td>
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                         </div>
                       </div>
                     );
                   })
                }
              </div>
            )}

            {/* --- TAB 2: HISTORY --- */}
            {activeTab === 'history' && (
              <div className="max-w-5xl mx-auto">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                     <div className="relative w-full md:w-1/3">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                        <input type="text" placeholder="Search Name/ID..." className="w-full pl-10 p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#c5a059]" value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} />
                     </div>
                     <div className="flex items-center gap-2 w-full md:w-auto">
                        <input type="date" className="p-2 border rounded-lg text-sm" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
                        <span className="text-gray-400">-</span>
                        <input type="date" className="p-2 border rounded-lg text-sm" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
                     </div>
                     {isSearchingHistory && <Loader2 className="animate-spin text-[#c5a059]" size={20}/>}
                  </div>

                  <div className="space-y-4">
                     {historyResults.length === 0 ? <div className="text-center py-10 text-gray-400 border-2 border-dashed rounded-xl">No history found.</div> : historyResults.map((consult) => (
                        <div key={consult.id} className="bg-white border rounded-xl p-5 shadow-sm flex justify-between items-center hover:shadow-md transition">
                           <div>
                              <h4 className="font-bold text-lg text-[#1e3a29]">{consult.patient.name}</h4>
                              <p className="text-xs text-gray-500">{new Date(consult.createdAt).toLocaleDateString()} • {consult.doctorName}</p>
                              <div className="mt-1 text-xs text-gray-600">Meds: {consult.prescriptions[0]?.items.map((i:any) => i.medicine?.name).join(", ")}</div>
                           </div>
                           
                           {/* ✅ SPLIT PRINT BUTTONS IN HISTORY */}
                           <div className="flex gap-2">
                               <button onClick={() => printConsultationBill(consult)} className="bg-blue-50 border border-blue-200 text-blue-700 font-bold px-3 py-2 rounded-lg text-xs hover:bg-blue-100 flex items-center gap-1">
                                  <Printer size={14}/> Consult
                               </button>
                               <button onClick={() => printPharmacyBill(consult, true)} className="bg-gray-100 border border-gray-300 text-gray-700 font-bold px-3 py-2 rounded-lg text-xs hover:bg-gray-200 flex items-center gap-1">
                                  <Printer size={14}/> Pharma
                               </button>
                           </div>
                        </div>
                     ))}
                  </div>
              </div>
            )}

            {/* --- TAB 3: INVENTORY --- */}
            {activeTab === 'inventory' && (
              <div className="max-w-6xl mx-auto">
                <div className="flex justify-between mb-6">
                   <div className="relative w-96">
                     <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                     <input type="text" placeholder="Search medicines..." className="w-full pl-10 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#c5a059] outline-none" value={inventorySearch} onChange={(e) => setInventorySearch(e.target.value)}/>
                   </div>
                   <div className="flex gap-2">
                     <button onClick={loadData} className="p-2 bg-white border rounded hover:bg-gray-50 text-gray-600"><RefreshCw size={18}/></button>
                     <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-[#1e3a29] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#162b1e]"><Plus size={16}/> Add New</button>
                   </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#1e3a29] text-white text-xs uppercase">
                      <tr>
                        <th className="p-4">Name</th>
                        <th className="p-4">Type</th>
                        <th className="p-4">Stock / Min</th>
                        <th className="p-4">Dates (Mfg/Exp)</th>
                        <th className="p-4">Price</th>
                        <th className="p-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredInventory.map((med) => (
                        <tr key={med.id} className="hover:bg-gray-50">
                          <td className="p-4 font-medium text-[#1e3a29]">{med.name}</td>
                          <td className="p-4 text-gray-500">
                            {editingId === med.id ? (
                                <select className="w-full p-1 border rounded text-sm bg-white focus:ring-2 focus:ring-[#c5a059] outline-none" value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value})}>
                                   <option>Tablet</option><option>Syrup</option><option>Powder</option><option>Oil</option><option>Capsule</option><option>Sachet</option><option>Pouch</option><option>Panchkarma</option><option>Procedure</option>
                                </select>
                            ) : med.type}
                          </td>
                          <td className="p-4">
                            {editingId === med.id ? <div className="space-y-1"><input className="w-16 p-1 border rounded text-center bg-yellow-50" value={editForm.stock} onChange={e => setEditForm({...editForm, stock: e.target.value})}/><input className="w-16 p-1 border rounded text-center text-xs" value={editForm.minStock} onChange={e => setEditForm({...editForm, minStock: e.target.value})}/></div> : <span className={med.stock < (med.minStock || 10) ? "text-red-500 font-bold" : "text-gray-700 font-bold"}>{med.stock} <span className="text-gray-400 font-normal text-xs">/ {med.minStock || 10}</span></span>}
                          </td>
                          <td className="p-4">
                             {editingId === med.id ? <div className="space-y-1"><input type="date" className="w-24 p-1 border rounded text-xs" value={editForm.mfgDate} onChange={e => setEditForm({...editForm, mfgDate: e.target.value})}/><input type="date" className="w-24 p-1 border rounded text-xs bg-red-50" value={editForm.expDate} onChange={e => setEditForm({...editForm, expDate: e.target.value})}/></div> : <div className="text-xs text-gray-600"><div>M: {med.mfgDate ? new Date(med.mfgDate).toLocaleDateString() : "-"}</div><div>E: {med.expDate ? new Date(med.expDate).toLocaleDateString() : "-"}</div></div>}
                          </td>
                          <td className="p-4">{editingId === med.id ? <input className="w-16 p-1 border rounded text-center bg-green-50" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})}/> : <span>₹{med.price}</span>}</td>
                          <td className="p-4 text-right">{editingId === med.id ? <button onClick={() => saveEdit(med.id)} className="text-green-600 font-bold hover:underline">Save</button> : <button onClick={() => handleEdit(med)} className="text-[#c5a059] font-bold hover:underline">Edit</button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* --- ADD MODAL --- */}
            {isAddModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-xl p-6 w-[500px] shadow-2xl animate-in zoom-in">
                  <h2 className="text-xl font-bold mb-6 text-[#1e3a29]">Add New Medicine</h2>
                  <div className="space-y-4">
                    <input className="w-full p-2 border rounded" placeholder="Medicine Name" value={newMed.name} onChange={e => setNewMed({...newMed, name: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                        <select className="p-2 border rounded" value={newMed.type} onChange={e => setNewMed({...newMed, type: e.target.value})}><option>Tablet</option><option>Syrup</option><option>Powder</option><option>Oil</option><option>Capsule</option><option>Sachet</option><option>Pouch</option></select>
                        <input className="p-2 border rounded" type="number" placeholder="Stock" value={newMed.stock} onChange={e => setNewMed({...newMed, stock: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <input className="p-2 border rounded" type="number" placeholder="Price" value={newMed.price} onChange={e => setNewMed({...newMed, price: e.target.value})} />
                        <input className="p-2 border rounded" type="number" placeholder="Min Alert" value={newMed.minStock} onChange={e => setNewMed({...newMed, minStock: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <input className="p-2 border rounded text-xs" type="date" value={newMed.mfgDate} onChange={e => setNewMed({...newMed, mfgDate: e.target.value})} />
                        <input className="p-2 border rounded text-xs" type="date" value={newMed.expDate} onChange={e => setNewMed({...newMed, expDate: e.target.value})} />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button onClick={() => setIsAddModalOpen(false)} className="flex-1 bg-gray-100 font-bold py-2 rounded">Cancel</button>
                      <button onClick={handleAddNew} className="flex-1 bg-[#1e3a29] text-white font-bold py-2 rounded">Save</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- DIRECT SALE MODAL --- */}
            {isWalkInModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex overflow-hidden animate-in zoom-in-95">
                    <div className="w-1/2 border-r bg-gray-50 flex flex-col p-4">
                       <input autoFocus type="text" placeholder="Search medicine..." className="w-full p-2 border rounded mb-4" value={walkInSearch} onChange={(e) => setWalkInSearch(e.target.value)}/>
                       <div className="flex-1 overflow-y-auto">{filteredWalkInInventory.map(med => (<button key={med.id} onClick={() => addToWalkInCart(med)} className="w-full text-left p-3 mb-2 bg-white border rounded hover:shadow-sm"><div className="font-bold">{med.name}</div><div className="text-xs text-gray-500">Stock: {med.stock} | ₹{med.price}</div></button>))}</div>
                    </div>
                    <div className="w-1/2 flex flex-col bg-white p-4">
                       <h3 className="font-bold text-lg mb-4">Direct Sale</h3>
                       <div className="relative mb-4" ref={patientSearchRef}>
                          <input placeholder="Search Patient Name *" className="w-full p-2 border rounded" value={walkInDetails.patientName} onChange={e => setWalkInDetails({...walkInDetails, patientName: e.target.value, patientId: ""})} />
                          {showPatientSearch && <div className="absolute top-full left-0 w-full bg-white border shadow-lg rounded mt-1 z-50 max-h-40 overflow-y-auto">{patientSuggestions.map(p => (<div key={p.id} onClick={() => { setWalkInDetails({ ...walkInDetails, patientName: p.name, phone: p.phone, patientId: p.id }); setShowPatientSearch(false); }} className="p-2 hover:bg-gray-100 cursor-pointer border-b">{p.name}</div>))}</div>}
                       </div>
                       <div className="flex-1 overflow-y-auto">
                          {walkInCart.map((item, idx) => (
                             <div key={idx} className="flex justify-between items-center border-b py-2">
                                <div>{item.name}</div>
                                <div className="flex items-center gap-2"><input type="number" min="1" className="w-12 p-1 border rounded text-center" value={item.qty} onChange={(e) => { const n=[...walkInCart]; n[idx].qty=parseInt(e.target.value)||1; setWalkInCart(n); }}/><button onClick={() => { const n=[...walkInCart]; n.splice(idx,1); setWalkInCart(n); }} className="text-red-500"><Trash2 size={16}/></button></div>
                             </div>
                          ))}
                       </div>
                       <button onClick={handleWalkInCheckout} className="w-full bg-[#1e3a29] text-white py-3 rounded font-bold mt-4">Complete Sale</button>
                    </div>
                  </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function PharmacyPage() {
  return <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#c5a059]" size={48}/></div>}><PharmacyContent/></Suspense>;
}