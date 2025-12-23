"use client";
import { useState, useEffect } from "react";
import { 
  Pill, Search, RefreshCw, Package, Clock, CheckCircle, 
  Loader2, Plus, Trash2, FileText, AlertTriangle 
} from "lucide-react";
import { 
  getInventory, updateMedicine, getPharmacyQueue, 
  dispenseMedicine, createMedicine, deleteMedicine 
} from "@/app/actions";
import StaffHeader from "@/app/components/StaffHeader"; 
import { generateBill } from "@/app/components/BillGenerator"; // 👈 New Import

export default function PharmacyPage() {
  const [activeTab, setActiveTab] = useState<'queue' | 'inventory'>('queue');
  const [inventory, setInventory] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // State for Inventory Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ stock: "", price: "" });

  // State for New Medicine Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMed, setNewMed] = useState({ name: "", type: "Tablet", stock: "0", price: "0" });

  // State for Dispensing Quantities
  const [dispenseQtys, setDispenseQtys] = useState<{[key: string]: string}>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [invData, queueData] = await Promise.all([
      getInventory(),
      getPharmacyQueue()
    ]);
    setInventory(invData);
    setQueue(queueData);
    
    // Initialize dispense quantities
    const initialQtys: {[key: string]: string} = {};
    queueData.forEach((q: any) => {
      q.prescriptions.forEach((p: any) => {
        p.items.forEach((i: any) => {
           // 👇 FIX: Use saved dispensedQty if it exists, otherwise default to 1
           initialQtys[i.id] = i.dispensedQty ? i.dispensedQty.toString() : "1"; 
        });
      });
    });
    setDispenseQtys(initialQtys);
    
    setLoading(false);
  };

 // --- 🆕 BILLING FUNCTION (Updated Format) ---
  const handlePrintBill = (consult: any) => {
    const items = consult.prescriptions[0]?.items.map((item: any) => {
       const qty = parseInt(dispenseQtys[item.id] || "1");
       const medInfo = inventory.find(i => i.name === item.medicine?.name);
       const unitPrice = medInfo?.price || 0;
       
       return {
          name: item.medicine?.name || "Medicine",
          qty: qty,
          amount: unitPrice * qty
       };
    }) || [];

    if(items.length === 0) return alert("No items to bill");

    // Create a cleaner Bill Number: PH-YYYYMMDD-ID
    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, "");
    const uniqueId = consult.id.slice(-4).toUpperCase();

    generateBill({
       billNo: `PH-${dateStr}-${uniqueId}`,
       date: new Date().toLocaleDateString(),
       patientName: consult.patient.name,
       items: items
    });
  };

  const handleQtyChange = (itemId: string, val: string) => {
    setDispenseQtys(prev => ({...prev, [itemId]: val}));
  };

  // --- DISPENSE LOGIC (Restored Original "No-Flash" Logic) ---
  const handleDispenseItem = async (itemId: string) => {
    const qtyToDeduct = parseInt(dispenseQtys[itemId]) || 1;
    
    if(qtyToDeduct <= 0) {
      alert("Please enter a valid quantity to dispense.");
      return;
    }

    const result = await dispenseMedicine(itemId, qtyToDeduct);
    
    if (result.success) {
      // 1. Update Queue UI locally (Optimistic)
      setQueue(prevQueue => prevQueue.map(consult => ({
        ...consult,
        prescriptions: consult.prescriptions.map((p: any) => ({
          ...p,
          items: p.items.map((i: any) => i.id === itemId ? { ...i, status: 'DISPENSED' } : i)
        }))
      })));

      // 2. Silently update inventory (No loading spinner)
      const freshInv = await getInventory();
      setInventory(freshInv);
    }
  };

  const handleDispenseAll = async (items: any[]) => {
    if(!confirm("Dispense all items using the quantities entered?")) return;
    for (const item of items) {
      if (item.status === 'PENDING') {
        await handleDispenseItem(item.id);
      }
    }
  };

  // --- INVENTORY FUNCTIONS ---
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
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-screen bg-[#FDFBF7] flex flex-col font-sans text-neutral-800 overflow-hidden">
      
      {/* 1. GLOBAL NAVIGATION */}
      <StaffHeader />
      
      {/* 2. LOCAL PHARMACY TOOLBAR */}
      <div className="bg-white border-b px-8 py-4 flex justify-between items-center shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
           <div className="bg-[#1e3a29] text-white p-2 rounded-lg">
             <Pill size={24} />
           </div>
           <h1 className="text-xl font-serif font-bold text-[#1e3a29]">Pharmacy Dashboard</h1>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 text-sm font-bold rounded-md transition flex items-center gap-2 ${activeTab === 'queue' ? 'bg-white shadow text-[#1e3a29]' : 'text-gray-500'}`}
          >
            <Clock size={16}/> Live Queue
            {queue.some(q => q.prescriptions.some((p:any) => p.items.some((i:any) => i.status === 'PENDING'))) && 
              <span className="bg-red-500 w-2 h-2 rounded-full animate-pulse"></span>
            }
          </button>
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 text-sm font-bold rounded-md transition flex items-center gap-2 ${activeTab === 'inventory' ? 'bg-white shadow text-[#1e3a29]' : 'text-gray-500'}`}
          >
            <Package size={16}/> Inventory
          </button>
        </div>
      </div>

      {/* 3. CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-8">
        {loading ? (
          <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-[#c5a059]" size={40}/></div>
        ) : (
          <>
            {/* --- TAB 1: LIVE QUEUE --- */}
            {activeTab === 'queue' && (
              <div className="max-w-5xl mx-auto space-y-4">
                {queue.length === 0 ? (
                   <div className="text-center py-20 text-gray-400 border-2 border-dashed rounded-xl">
                     No patients waiting right now.
                   </div>
                ) : (
                   queue.map((consult) => (
                     <div key={consult.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition">
                       <div className="flex justify-between items-start mb-4">
                         <div>
                           <h3 className="text-lg font-bold text-[#1e3a29]">{consult.patient.name}</h3>
                           <p className="text-xs text-gray-500">Prescribed by {consult.doctorName} • {new Date(consult.createdAt).toLocaleTimeString()}</p>
                         </div>
                         <div className="flex gap-2">
                           {/* 🆕 GENERATE BILL BUTTON */}
                           <button 
                             onClick={() => handlePrintBill(consult)}
                             className="bg-white border border-[#1e3a29] text-[#1e3a29] font-bold px-4 py-2 rounded-lg text-xs hover:bg-gray-50 transition flex items-center gap-2"
                           >
                             <FileText size={14}/> Generate Bill
                           </button>

                           <button 
                             onClick={() => handleDispenseAll(consult.prescriptions[0]?.items || [])}
                             className="bg-[#1e3a29] text-white font-bold px-4 py-2 rounded-lg text-xs shadow hover:bg-[#162b1e] transition flex items-center gap-2"
                           >
                             <CheckCircle size={14}/> Dispense All
                           </button>
                         </div>
                       </div>
                       
                       <div className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
                         <table className="w-full text-sm">
                           <thead className="bg-gray-100 text-xs uppercase text-gray-500 text-left">
                             <tr>
                               <th className="p-3 w-1/4">Medicine</th>
                               <th className="p-3">Dosage</th>
                               <th className="p-3">Duration</th>
                               <th className="p-3 text-center w-24">Qty Given</th>
                               <th className="p-3 text-right">Status</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-200">
                             {consult.prescriptions[0]?.items.map((item: any) => (
                               <tr key={item.id} className={item.status === 'DISPENSED' ? 'bg-green-50' : ''}>
                                 <td className="p-3 font-medium text-[#1e3a29]">{item.medicine?.name || "Unknown"}</td>
                                 <td className="p-3 text-gray-500">{item.dosage}</td>
                                 <td className="p-3 font-bold">{item.duration}</td>
                                 
                                 {/* QUANTITY INPUT */}
                                 <td className="p-3 text-center">
                                  {item.status === 'PENDING' ? (
                                    <input 
                                      type="number" 
                                      className="w-16 p-1 border border-gray-300 rounded text-center text-sm font-bold focus:border-[#c5a059] outline-none"
                                      value={dispenseQtys[item.id] || "1"}
                                      onChange={(e) => handleQtyChange(item.id, e.target.value)}
                                      min="1"
                                    />
                                  ) : (
                                    // 👇 FIX: Show the actual dispensed quantity instead of "-"
                                    <span className="text-gray-600 font-bold bg-gray-100 px-2 py-1 rounded">
                                      {item.dispensedQty || dispenseQtys[item.id] || 1}
                                    </span>
                                  )}
                                  </td>

                                 <td className="p-3 text-right">
                                    {item.status === 'DISPENSED' ? (
                                      <span className="inline-flex items-center gap-1 text-green-700 font-bold text-xs bg-green-100 px-2 py-1 rounded-full">
                                        <CheckCircle size={12}/> Dispensed
                                      </span>
                                    ) : (
                                      <button 
                                        onClick={() => handleDispenseItem(item.id)}
                                        className="inline-flex items-center gap-1 bg-[#c5a059] text-[#1e3a29] font-bold text-xs px-3 py-1.5 rounded hover:bg-[#b08d4b] transition shadow-sm"
                                      >
                                        Dispense
                                      </button>
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

            {/* --- TAB 2: INVENTORY --- */}
            {activeTab === 'inventory' && (
              <div className="max-w-5xl mx-auto">
                <div className="flex justify-between mb-6">
                   <div className="relative w-96">
                     <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                     <input 
                       type="text" 
                       placeholder="Search medicines..." 
                       className="w-full pl-10 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#c5a059] outline-none"
                       value={searchTerm}
                       onChange={(e) => setSearchTerm(e.target.value)}
                     />
                   </div>
                   <div className="flex gap-2">
                     <button onClick={loadData} className="p-2 bg-white border rounded hover:bg-gray-50 text-gray-600">
                       <RefreshCw size={18}/>
                     </button>
                     <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 bg-[#1e3a29] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#162b1e]"
                     >
                       <Plus size={16}/> Add New
                     </button>
                   </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#1e3a29] text-white text-xs uppercase">
                      <tr>
                        <th className="p-4 font-medium">Medicine Name</th>
                        <th className="p-4 font-medium">Type</th>
                        <th className="p-4 font-medium">Stock</th>
                        <th className="p-4 font-medium">Price (₹)</th>
                        <th className="p-4 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredInventory.map((med) => (
                        <tr key={med.id} className="hover:bg-gray-50 group">
                          <td className="p-4 font-medium text-[#1e3a29]">{med.name}</td>
                          <td className="p-4 text-gray-500">{med.type}</td>
                          <td className="p-4">
                            {editingId === med.id ? (
                              <input className="w-20 p-1 border rounded text-center bg-yellow-50" value={editForm.stock} onChange={(e) => setEditForm({...editForm, stock: e.target.value})} />
                            ) : (
                              <span className={`font-bold ${med.stock < 10 ? 'text-red-500' : 'text-gray-700'}`}>{med.stock} units</span>
                            )}
                          </td>
                          <td className="p-4">
                            {editingId === med.id ? (
                               <input className="w-20 p-1 border rounded text-center bg-yellow-50" value={editForm.price} onChange={(e) => setEditForm({...editForm, price: e.target.value})} />
                            ) : (
                               <span>₹ {med.price}</span>
                            )}
                          </td>
                          <td className="p-4 text-right flex justify-end gap-3">
                            {editingId === med.id ? (
                              <button onClick={() => saveEdit(med.id)} className="text-green-600 font-bold hover:underline">Save</button>
                            ) : (
                              <>
                                <button onClick={() => handleEdit(med)} className="text-[#c5a059] font-bold hover:underline opacity-0 group-hover:opacity-100 transition">Edit</button>
                                <button onClick={() => handleDelete(med.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"><Trash2 size={16}/></button>
                              </>
                            )}
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
                      <input 
                        className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-[#c5a059] outline-none" 
                        placeholder="e.g. Paracetamol" 
                        value={newMed.name} 
                        onChange={e => setNewMed({...newMed, name: e.target.value})} 
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Type</label>
                      <select 
                        className="w-full p-2 border rounded text-sm bg-white focus:ring-2 focus:ring-[#c5a059] outline-none" 
                        value={newMed.type} 
                        onChange={e => setNewMed({...newMed, type: e.target.value})}
                      >
                        <option>Tablet</option>
                        <option>Syrup</option>
                        <option>Powder</option>
                        <option>Oil</option>
                        <option>Capsule</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Initial Stock</label>
                        <input 
                          className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-[#c5a059] outline-none" 
                          type="number" 
                          placeholder="0" 
                          value={newMed.stock} 
                          onChange={e => setNewMed({...newMed, stock: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Price (₹)</label>
                        <input 
                          className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-[#c5a059] outline-none" 
                          type="number" 
                          placeholder="0" 
                          value={newMed.price} 
                          onChange={e => setNewMed({...newMed, price: e.target.value})} 
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button onClick={() => setIsAddModalOpen(false)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-2 rounded text-sm hover:bg-gray-200">
                        Cancel
                      </button>
                      <button onClick={handleAddNew} className="flex-1 bg-[#1e3a29] text-white font-bold py-2 rounded text-sm hover:bg-[#162b1e]">
                        Create Item
                      </button>
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