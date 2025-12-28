"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation"; // 👈 Import navigation hooks
import { 
  Pill, Search, RefreshCw, Package, Clock, CheckCircle, 
  Loader2, Plus, Trash2, FileText, History, Printer, Calendar 
} from "lucide-react";
import { 
  getPharmacyInventory, updateMedicine, getPharmacyQueue, 
  dispenseMedicine, createMedicine, deleteMedicine,
  getDispensedHistory 
} from "@/app/actions";
import StaffHeader from "@/app/components/StaffHeader"; 
import { generateBill } from "@/app/components/BillGenerator"; 

export default function PharmacyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Default to queue, but check URL param 'tab' immediately
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

  // Inventory Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ stock: "", price: "" });

  // Add Medicine Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMed, setNewMed] = useState({ name: "", type: "Tablet", stock: "0", price: "0" });

  // Dispensing State
  const [dispenseQtys, setDispenseQtys] = useState<{[key: string]: string}>({});

  // --- 1. LISTEN FOR URL PARAMS ---
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['queue', 'inventory', 'history'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  // Helper to update URL when tab changes manually
  const switchTab = (tab: 'queue' | 'inventory' | 'history') => {
    setActiveTab(tab);
    router.replace(`/pharmacy?tab=${tab}`);
  };

  // --- 2. LOAD INITIAL DATA ---
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

  // --- 4. BILLING GENERATOR ---
  const handlePrintBill = (consult: any, isReprint = false) => {
    const items = consult.prescriptions[0]?.items.map((item: any) => {
       const qty = isReprint 
          ? (item.dispensedQty || 1) 
          : parseInt(dispenseQtys[item.id] || (item.dispensedQty ? item.dispensedQty.toString() : "1"));

       const medInfo = inventory.find(i => i.name === item.medicine?.name);
       const unitPrice = medInfo?.price || 0;
       
       return {
          name: `${item.medicine?.name || "Medicine"} (${item.unit || '-'})`,
          qty: qty,
          amount: unitPrice * qty
       };
    }) || [];

    if(items.length === 0) return alert("No items to bill");

    const dateStr = new Date(consult.createdAt).toISOString().slice(0,10).replace(/-/g, "");
    const uniqueId = consult.id.slice(-4).toUpperCase();
    const billNo = `PH-${dateStr}-${uniqueId}`;

    generateBill({
       billNo: billNo,
       date: new Date(consult.createdAt).toLocaleDateString(),
       patientName: consult.patient.name,
       patientId: consult.patient.readableId || consult.patient.id.slice(0,6),
       appointmentId: consult.appointment?.readableId || "WALK-IN",
       doctorName: consult.doctorName || "Dr. Chirag Raval",
       items: items
    });
  };

  // --- 5. DISPENSE ACTIONS ---
  const handleQtyChange = (itemId: string, val: string) => {
    setDispenseQtys(prev => ({...prev, [itemId]: val}));
  };

  const handleDispenseItem = async (itemId: string) => {
    const qtyToDeduct = parseInt(dispenseQtys[itemId]) || 1;
    if(qtyToDeduct <= 0) return alert("Invalid quantity");

    const result = await dispenseMedicine(itemId, qtyToDeduct);
    
    if (result.success) {
      setQueue(prev => prev.map(consult => ({
        ...consult,
        prescriptions: consult.prescriptions.map((p: any) => ({
          ...p,
          items: p.items.map((i: any) => i.id === itemId ? { ...i, status: 'DISPENSED', dispensedQty: qtyToDeduct } : i)
        }))
      })));
      const inv = await getPharmacyInventory();
      setInventory(inv);
    }
  };

  const handleDispenseAll = async (items: any[]) => {
    if(!confirm("Dispense all items using entered quantities?")) return;
    for (const item of items) {
      if (item.status === 'PENDING') {
        await handleDispenseItem(item.id);
      }
    }
  };

  // --- 6. INVENTORY CRUD ---
  const handleAddNew = async () => {
    await createMedicine(newMed);
    setIsAddModalOpen(false);
    setNewMed({ name: "", type: "Tablet", stock: "0", price: "0" });
    loadData();
  };

  const handleDelete = async (id: string) => {
    if(confirm("Delete this medicine permanently?")) {
      await deleteMedicine(id);
      loadData();
    }
  };

  const handleEdit = (med: any) => {
    setEditingId(med.id);
    setEditForm({ stock: med.stock.toString(), price: med.price.toString() });
  };

  const saveEdit = async (id: string) => {
    await updateMedicine(id, editForm);
    setEditingId(null);
    loadData();
  };

  const filteredInventory = inventory.filter(m => 
    m.name.toLowerCase().includes(inventorySearch.toLowerCase())
  );

  return (
    <div className="h-screen bg-[#FDFBF7] flex flex-col font-sans text-neutral-800 overflow-hidden">
      <StaffHeader />
      
      {/* TOOLBAR */}
      <div className="bg-white border-b px-8 py-4 flex justify-between items-center shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
           <div className="bg-[#1e3a29] text-white p-2 rounded-lg"><Pill size={24} /></div>
           <h1 className="text-xl font-serif font-bold text-[#1e3a29]">Pharmacy Dashboard</h1>
        </div>
        
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

      <div className="flex-1 overflow-y-auto p-8">
        {loading ? <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-[#c5a059]" size={40}/></div> : (
          <>
            {/* --- TAB 1: LIVE QUEUE --- */}
            {activeTab === 'queue' && (
              <div className="max-w-6xl mx-auto space-y-4">
                {queue.length === 0 ? (
                   <div className="text-center py-20 text-gray-400 border-2 border-dashed rounded-xl">
                     <Clock className="mx-auto mb-2 text-gray-300" size={40}/>
                     No active patients waiting.
                   </div>
                ) : (
                   queue.map((consult) => (
                     <div key={consult.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition">
                       {/* Consult Header */}
                       <div className="flex justify-between items-start mb-4">
                         <div>
                           <h3 className="text-lg font-bold text-[#1e3a29]">{consult.patient.name}</h3>
                           <p className="text-xs text-gray-500">Prescribed by {consult.doctorName} • {new Date(consult.createdAt).toLocaleTimeString()}</p>
                           <div className="flex gap-2 mt-1">
                              <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500 font-mono">PID: {consult.patient.readableId || "-"}</span>
                              <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-mono">APP: {consult.appointment?.readableId || "WALK-IN"}</span>
                           </div>
                         </div>
                         <div className="flex gap-2">
                           <button onClick={() => handlePrintBill(consult, false)} className="bg-white border border-[#1e3a29] text-[#1e3a29] font-bold px-4 py-2 rounded-lg text-xs hover:bg-gray-50 transition flex items-center gap-2">
                             <FileText size={14}/> Generate Bill
                           </button>
                           <button onClick={() => handleDispenseAll(consult.prescriptions[0]?.items || [])} className="bg-[#1e3a29] text-white font-bold px-4 py-2 rounded-lg text-xs shadow hover:bg-[#162b1e] transition flex items-center gap-2">
                             <CheckCircle size={14}/> Dispense All
                           </button>
                         </div>
                       </div>
                       
                       {/* Prescriptions Table */}
                       <div className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
                         <table className="w-full text-sm">
                           <thead className="bg-gray-100 text-xs uppercase text-gray-500 text-left">
                             <tr>
                               <th className="p-3 w-1/4">Medicine</th>
                               <th className="p-3">Dosage / Info</th>
                               <th className="p-3">Duration</th>
                               <th className="p-3 text-center w-24">Qty Given</th>
                               <th className="p-3 text-right">Status</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-200">
                             {consult.prescriptions[0]?.items.map((item: any) => (
                               <tr key={item.id} className={item.status === 'DISPENSED' ? 'bg-green-50' : ''}>
                                 <td className="p-3">
                                    <div className="font-medium text-[#1e3a29]">{item.medicine?.name || "Unknown"}</div>
                                    <div className="flex gap-2 mt-1">
                                       <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded text-gray-600 font-bold">{item.unit || "Tablet"}</span>
                                       {item.panchkarma && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">{item.panchkarma}</span>}
                                    </div>
                                 </td>
                                 <td className="p-3">
                                    <div className="font-mono text-xs text-gray-800">{item.dosage}</div>
                                    <div className="text-[10px] text-gray-500">{item.instruction}</div>
                                 </td>
                                 <td className="p-3 font-bold text-gray-600">{item.duration}</td>
                                 <td className="p-3 text-center">
                                    {item.status === 'PENDING' ? (
                                      <input type="number" className="w-16 p-1 border border-gray-300 rounded text-center text-sm font-bold focus:border-[#c5a059] outline-none" 
                                        value={dispenseQtys[item.id] || "1"} 
                                        onChange={(e) => handleQtyChange(item.id, e.target.value)} min="1"/>
                                    ) : (
                                      <span className="text-gray-600 font-bold bg-white border px-2 py-1 rounded">{item.dispensedQty || 1}</span>
                                    )}
                                 </td>
                                 <td className="p-3 text-right">
                                    {item.status === 'DISPENSED' ? (
                                      <span className="inline-flex items-center gap-1 text-green-700 font-bold text-xs bg-green-100 px-2 py-1 rounded-full"><CheckCircle size={12}/> Dispensed</span>
                                    ) : (
                                      <button onClick={() => handleDispenseItem(item.id)} className="inline-flex items-center gap-1 bg-[#c5a059] text-[#1e3a29] font-bold text-xs px-3 py-1.5 rounded hover:bg-[#b08d4b]">Dispense</button>
                                    )}
                                 </td>
                               </tr>
                             ))}
                           </tbody>
                         </table>
                       </div>
                     </div>
                   ))
                )}
              </div>
            )}

            {/* --- TAB 2: HISTORY --- */}
            {activeTab === 'history' && (
              <div className="max-w-5xl mx-auto">
                 {/* FILTERS BAR */}
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                    
                    {/* Search */}
                    <div className="relative w-full md:w-1/3">
                       <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                       <input 
                         type="text" 
                         placeholder="Search Name, Phone or ID..." 
                         className="w-full pl-10 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#c5a059] outline-none"
                         value={historySearch}
                         onChange={(e) => setHistorySearch(e.target.value)}
                       />
                    </div>

                    {/* Date Filters */}
                    <div className="flex items-center gap-2 w-full md:w-auto">
                       <div className="flex items-center bg-gray-50 border rounded-lg p-2 gap-2">
                          <span className="text-xs font-bold text-gray-500 uppercase">From</span>
                          <input type="date" className="bg-transparent text-sm outline-none" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
                       </div>
                       <span className="text-gray-400">-</span>
                       <div className="flex items-center bg-gray-50 border rounded-lg p-2 gap-2">
                          <span className="text-xs font-bold text-gray-500 uppercase">To</span>
                          <input type="date" className="bg-transparent text-sm outline-none" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
                       </div>
                    </div>

                    {isSearchingHistory && <Loader2 className="animate-spin text-[#c5a059]" size={20}/>}
                 </div>

                 {/* RESULTS LIST */}
                 <div className="space-y-4">
                    {historyResults.length === 0 ? (
                       <div className="text-center text-gray-400 py-10 border-2 border-dashed rounded-xl bg-gray-50">
                          {historySearch || dateRange.start ? "No records found matching your filters." : "No recent dispensed history found."}
                       </div>
                    ) : (
                       historyResults.map((consult) => (
                          <div key={consult.id} className="bg-white border rounded-xl p-5 shadow-sm flex justify-between items-center hover:shadow-md transition">
                             <div>
                                <h4 className="font-bold text-lg text-[#1e3a29]">{consult.patient.name}</h4>
                                <div className="text-xs text-gray-500 mt-1 flex gap-3">
                                   <span className="flex items-center gap-1"><Clock size={12}/> {new Date(consult.createdAt).toLocaleDateString()}</span>
                                   <span>👨‍⚕️ {consult.doctorName}</span>
                                   <span className="font-mono bg-gray-100 px-1 rounded text-gray-600">ID: {consult.patient.readableId}</span>
                                </div>
                                <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 max-w-md">
                                   <span className="font-bold">Medicines: </span>
                                   {consult.prescriptions[0]?.items.map((i:any) => i.medicine?.name).join(", ")}
                                </div>
                             </div>
                             <button 
                               onClick={() => handlePrintBill(consult, true)}
                               className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition border border-gray-300"
                             >
                               <Printer size={16}/> Reprint Bill
                             </button>
                          </div>
                       ))
                    )}
                 </div>
              </div>
            )}

            {/* --- TAB 3: INVENTORY --- */}
            {activeTab === 'inventory' && (
              <div className="max-w-5xl mx-auto">
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
                        <th className="p-4 font-medium">Medicine Name</th><th className="p-4 font-medium">Type</th><th className="p-4 font-medium">Stock</th><th className="p-4 font-medium">Price (₹)</th><th className="p-4 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredInventory.map((med) => (
                        <tr key={med.id} className="hover:bg-gray-50 group">
                          <td className="p-4 font-medium text-[#1e3a29]">{med.name}</td>
                          <td className="p-4 text-gray-500">{med.type}</td>
                          <td className="p-4">
                            {editingId === med.id ? <input className="w-20 p-1 border rounded text-center bg-yellow-50" value={editForm.stock} onChange={(e) => setEditForm({...editForm, stock: e.target.value})} /> : <span className={`font-bold ${med.stock < 10 ? 'text-red-500' : 'text-gray-700'}`}>{med.stock} units</span>}
                          </td>
                          <td className="p-4">
                            {editingId === med.id ? <input className="w-20 p-1 border rounded text-center bg-yellow-50" value={editForm.price} onChange={(e) => setEditForm({...editForm, price: e.target.value})} /> : <span>₹ {med.price}</span>}
                          </td>
                          <td className="p-4 text-right flex justify-end gap-3">
                            {editingId === med.id ? <button onClick={() => saveEdit(med.id)} className="text-green-600 font-bold hover:underline">Save</button> : <><button onClick={() => handleEdit(med)} className="text-[#c5a059] font-bold hover:underline opacity-0 group-hover:opacity-100 transition">Edit</button><button onClick={() => handleDelete(med.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"><Trash2 size={16}/></button></>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* --- ADD MEDICINE MODAL --- */}
            {isAddModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-xl p-6 w-96 shadow-2xl animate-in zoom-in">
                  <h2 className="text-xl font-bold mb-6 text-[#1e3a29]">Add New Medicine</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Medicine Name</label>
                      <input className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-[#c5a059] outline-none" placeholder="e.g. Paracetamol" value={newMed.name} onChange={e => setNewMed({...newMed, name: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Type</label>
                      <select className="w-full p-2 border rounded text-sm bg-white focus:ring-2 focus:ring-[#c5a059] outline-none" value={newMed.type} onChange={e => setNewMed({...newMed, type: e.target.value})}>
                        <option>Tablet</option><option>Syrup</option><option>Powder</option><option>Oil</option><option>Capsule</option><option>Spoon (tsp)</option><option>ml</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-xs font-bold uppercase text-gray-500 mb-1">Initial Stock</label><input className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-[#c5a059] outline-none" type="number" placeholder="0" value={newMed.stock} onChange={e => setNewMed({...newMed, stock: e.target.value})} /></div>
                      <div><label className="block text-xs font-bold uppercase text-gray-500 mb-1">Price (₹)</label><input className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-[#c5a059] outline-none" type="number" placeholder="0" value={newMed.price} onChange={e => setNewMed({...newMed, price: e.target.value})} /></div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button onClick={() => setIsAddModalOpen(false)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-2 rounded text-sm hover:bg-gray-200">Cancel</button>
                      <button onClick={handleAddNew} className="flex-1 bg-[#1e3a29] text-white font-bold py-2 rounded text-sm hover:bg-[#162b1e]">Create Item</button>
                    </div>
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