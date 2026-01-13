"use client";

import { useState, useEffect, useRef, useMemo, memo } from "react"; 
import { useSearchParams, useRouter } from "next/navigation"; 
import { 
  Pill, Search, RefreshCw, Package, Clock, CheckCircle, 
  Loader2, Plus, Trash2, FileText, History, Printer,
  ShoppingCart, X, BadgePercent, User, AlertTriangle, Stethoscope, Filter,
  RotateCcw, Banknote, MessageCircle 
} from "lucide-react";
import { 
  getPharmacyInventory, updateMedicine, getPharmacyQueue, 
  dispenseMedicine, createMedicine, deleteMedicine,
  getDispensedHistory, searchPatients, savePrescription,
  reopenConsultation, deleteVisit 
} from "@/app/actions";
import StaffHeader from "@/app/components/StaffHeader"; 
import { generateBill } from "@/app/components/BillGenerator"; 

const MEDICINE_TYPES = [
  "Syrup", "Lehyam", "Oil", "Powder", "Soap", "Shampoo", "Gel", 
  "Ointment", "Scrub", "Lehya", "Hair Pack", "Face Pack", 
  "Granules", "Pak", "Tablet", "Capsule", "Sachet", "Bhasma", 
  "Ghrit", "Panchkarma", "Procedure"
];

// --- 1. Extracted Inventory Row (Optimized) ---
const InventoryRow = memo(({ med, editingId, editForm, setEditForm, handleEdit, saveEdit, handleDelete }: any) => {
    const isEditing = editingId === med.id;
    return (
        <tr className="hover:bg-gray-50 group">
          <td className="p-4 font-medium text-[#1e3a29]">
             {isEditing ? (
                <input className="w-full p-1 border rounded text-sm bg-white focus:ring-2 focus:ring-[#c5a059] outline-none" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
             ) : med.name}
          </td>
          <td className="p-4 text-gray-500">
            {isEditing ? (
                <select className="w-full p-1 border rounded text-sm bg-white focus:ring-2 focus:ring-[#c5a059] outline-none" value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value})}>
                   {MEDICINE_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
            ) : med.type}
          </td>
          <td className="p-4">
            {isEditing ? (
                <div className="space-y-1">
                    <input className="w-16 p-1 border rounded text-center bg-yellow-50" placeholder="Stock" value={editForm.stock} onChange={(e) => setEditForm({...editForm, stock: e.target.value})} />
                    <input className="w-16 p-1 border rounded text-center bg-red-50 text-xs" placeholder="Min" value={editForm.minStock} onChange={(e) => setEditForm({...editForm, minStock: e.target.value})} />
                </div>
            ) : (
                <div>
                    <div className={`font-bold flex items-center gap-2 ${med.stock < (med.minStock || 10) ? 'text-red-500' : 'text-gray-700'}`}>
                        {med.stock} <span className="text-gray-400 text-xs font-normal">/ {med.minStock || 10}</span>
                        {med.stock < (med.minStock || 10) && <AlertTriangle size={14} className="text-red-500"/>}
                    </div>
                </div>
            )}
          </td>
          <td className="p-4">
             {isEditing ? (
                <div className="space-y-1">
                   <input type="date" className="w-24 p-1 border rounded text-xs" value={editForm.mfgDate} onChange={e => setEditForm({...editForm, mfgDate: e.target.value})}/>
                   <input type="date" className="w-24 p-1 border rounded text-xs bg-red-50" value={editForm.expDate} onChange={e => setEditForm({...editForm, expDate: e.target.value})}/>
                </div>
             ) : (
                <div className="text-xs text-gray-600 space-y-0.5">
                   <div><span className="font-bold text-gray-400">M:</span> {med.mfgDate ? new Date(med.mfgDate).toLocaleDateString() : "-"}</div>
                   <div><span className="font-bold text-red-300">E:</span> {med.expDate ? new Date(med.expDate).toLocaleDateString() : "-"}</div>
                </div>
             )}
          </td>
          <td className="p-4">
            {isEditing ? <input className="w-16 p-1 border rounded text-center bg-green-50" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} /> : <span>₹ {med.price}</span>}
          </td>
          <td className="p-4 text-right flex justify-end gap-3">
            {isEditing ? <button onClick={() => saveEdit(med.id)} className="text-green-600 font-bold hover:underline">Save</button> : <><button onClick={() => handleEdit(med)} className="text-[#c5a059] font-bold hover:underline opacity-0 group-hover:opacity-100 transition">Edit</button><button onClick={() => handleDelete(med.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"><Trash2 size={16}/></button></>}
          </td>
        </tr>
    );
});
InventoryRow.displayName = "InventoryRow";

// --- 2. Extracted Queue Card (Optimized & Fixed Logic) ---
const QueueItem = memo(({ 
    consult, dispenseQtys, handleQtyChange, discounts, discountTypes, 
    handleDiscountChange, toggleDiscountType, 
    printConsultationBill, printPharmacyBill, handleDispenseAll, handleDispenseItem, 
    handleReopen, handleDeleteHistoryRecord, isHistory = false 
}: any) => {

    const fee = 500 - (consult.discount || 0);
    const discountType = discountTypes[consult.id] || 'PERCENT';

    let currentTotal = 0;
    const items = consult.prescriptions?.[0]?.items || [];
    
    items.forEach((item: any) => {
        // Live Queue: Use input. History: Use dispensed amount.
        const qty = isHistory 
            ? (item.dispensedQty || 1)
            : parseInt(dispenseQtys[item.id] || (item.dispensedQty ? item.dispensedQty.toString() : "1"));
        
        const medPrice = item.medicine?.price || 0;
        
        // Sum cost for ALL items so total is accurate
        currentTotal += (qty * medPrice);
    });

    // ✅ CRITICAL FIX: DISCOUNT LOGIC
    // If user typed a discount, use it. If not, use the DB saved discount (for History).
    const inputDiscount = parseFloat(discounts[consult.id] || "0");
    const dbDiscount = parseFloat(consult.discount || "0");
    
    // In History, we prioritize DB discount if input is empty
    const effectiveDiscount = (isHistory && inputDiscount === 0) ? dbDiscount : inputDiscount;

    let finalTotal = currentTotal;
    
    if (effectiveDiscount > 0) {
        // In history, usually DB discount is the flat amount already calculated
        if (isHistory && inputDiscount === 0) {
            finalTotal = currentTotal - effectiveDiscount;
        } else {
            // Live calculation or if user is editing in history
            if (discountType === 'PERCENT') {
                finalTotal = currentTotal - ((currentTotal * effectiveDiscount) / 100);
            } else {
                finalTotal = currentTotal - effectiveDiscount;
            }
        }
    }

    // WhatsApp Share Logic
    const handleShareBill = () => {
        if (!consult.patient?.phone && !consult.phone) return alert("No phone number found.");
        let phone = (consult.patient?.phone || consult.phone).replace(/[^0-9]/g, '');
        if (phone.length === 10) phone = "91" + phone;
        const message = `Namaste ${consult.patient.name}, your total pharmacy bill at Rudra Ayurved is ₹${finalTotal.toFixed(0)}. Thank you for visiting us.`;
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-[#1e3a29]">{consult.patient.name}</h3>
                        {!isHistory && (
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold border flex items-center gap-1 ${fee > 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                <Stethoscope size={10}/>
                                Consultation: {fee > 0 ? `₹${fee}` : "FREE"}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Prescribed by {consult.doctorName} • {new Date(consult.createdAt).toLocaleTimeString()}</p>
                    <div className="flex gap-2 mt-2">
                        <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500 font-mono">PID: {consult.patient.readableId || "-"}</span>
                        {!isHistory && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-mono">APP: {consult.appointment?.readableId || "WALK-IN"}</span>}
                    </div>
                </div>
                
                {!isHistory && (
                <div className="flex flex-col items-end gap-2">
                    <div className="text-lg font-bold text-[#1e3a29] flex items-center gap-2 bg-green-50 px-3 py-1 rounded border border-green-100">
                        <Banknote size={18} className="text-green-600"/>
                        Total: ₹{finalTotal.toFixed(0)}
                    </div>

                    <div className="flex gap-2 items-center">
                        <div className="flex items-center bg-gray-50 border rounded overflow-hidden">
                            <button onClick={() => toggleDiscountType(consult.id)} className="px-2 py-1 text-[10px] font-bold bg-gray-200 text-gray-600 hover:bg-gray-300 border-r" title="Click to switch between % and ₹">
                                {discountType === 'PERCENT' ? '%' : '₹'}
                            </button>
                            <input type="number" placeholder={discountType === 'PERCENT' ? "Disc %" : "Disc ₹"} className="w-16 px-2 py-1 text-xs bg-transparent outline-none font-medium" value={discounts[consult.id] || ""} onChange={(e) => handleDiscountChange(consult.id, e.target.value)}/>
                        </div>
                        
                        <button onClick={handleShareBill} className="text-[#25D366] hover:bg-green-50 p-2 rounded-lg transition border border-transparent hover:border-green-200" title="Share Bill on WhatsApp">
                            <MessageCircle size={18}/>
                        </button>

                        <button onClick={() => printConsultationBill(consult)} className="bg-blue-50 border border-blue-200 text-blue-700 font-bold px-3 py-2 rounded-lg text-xs hover:bg-blue-100 transition flex items-center gap-1"><FileText size={14}/> Consult</button>
                        <button onClick={() => printPharmacyBill(consult, false)} className="bg-white border border-[#1e3a29] text-[#1e3a29] font-bold px-3 py-2 rounded-lg text-xs hover:bg-gray-50 transition flex items-center gap-1"><FileText size={14}/> Meds</button>
                        <button onClick={() => handleDispenseAll(items)} className="bg-[#1e3a29] text-white font-bold px-4 py-2 rounded-lg text-xs shadow hover:bg-[#162b1e] transition flex items-center gap-2"><CheckCircle size={14}/> Dispense</button>
                    </div>
                </div>
                )}

                {isHistory && (
                    <div className="flex flex-col items-end">
                         <div className="mt-2 text-sm font-bold text-[#1e3a29] flex items-center gap-2 mb-2">
                             <Banknote size={16} className="text-[#c5a059]"/> Total Bill: ₹{finalTotal.toFixed(0)}
                         </div>
                         <div className="flex gap-2">
                            <button onClick={handleShareBill} className="text-[#25D366] hover:bg-green-50 p-2 rounded-lg transition border border-transparent hover:border-green-200" title="Share Bill on WhatsApp">
                                <MessageCircle size={18}/>
                            </button>

                            <button onClick={() => handleReopen(consult.id)} className="bg-amber-50 border border-amber-200 text-amber-700 font-bold px-3 py-2 rounded-lg text-xs hover:bg-amber-100 flex items-center gap-1 transition"><RotateCcw size={14}/> Reopen</button>
                            <button onClick={() => printConsultationBill(consult)} className="bg-blue-50 border border-blue-200 text-blue-700 font-bold px-3 py-2 rounded-lg text-xs hover:bg-blue-100 flex items-center gap-1 transition"><Printer size={14}/> Consult</button>
                            <button onClick={() => printPharmacyBill(consult, true)} className="bg-gray-100 border border-gray-300 text-gray-700 font-bold px-3 py-2 rounded-lg text-xs hover:bg-gray-200 flex items-center gap-1 transition"><Printer size={14}/> Pharma</button>
                            <button onClick={() => handleDeleteHistoryRecord(consult.id, consult.patientId)} className="bg-red-50 border border-red-200 text-red-600 font-bold px-3 py-2 rounded-lg text-xs hover:bg-red-100 flex items-center gap-1 transition"><Trash2 size={14}/></button>
                         </div>
                    </div>
                )}
            </div>

            <div className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100 text-xs uppercase text-gray-500 text-left">
                        <tr>
                            <th className="p-3 w-1/4">Medicine</th>
                            <th className="p-3">Dosage / Info</th>
                            <th className="p-3">Duration</th>
                            <th className="p-3 text-center w-24">Qty Given</th>
                            <th className="p-3 text-right w-24">Cost (₹)</th>
                            <th className="p-3 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {items.map((item: any) => {
                            const currentQty = isHistory
                                ? (item.dispensedQty || 1)
                                : parseInt(dispenseQtys[item.id] || (item.dispensedQty ? item.dispensedQty.toString() : "1"));
                            
                            const itemCost = (item.medicine?.price || 0) * currentQty;
                            return (
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
                                                onChange={(e) => handleQtyChange(item.id, e.target.value)} min="1" />
                                        ) : (
                                            <span className="text-gray-600 font-bold bg-white border px-2 py-1 rounded">{item.dispensedQty || 1}</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-right font-bold text-gray-700">₹{itemCost}</td>
                                    <td className="p-3 text-right">
                                        {item.status === 'DISPENSED' ? (
                                            <span className="inline-flex items-center gap-1 text-green-700 font-bold text-xs bg-green-100 px-2 py-1 rounded-full"><CheckCircle size={12} /> Dispensed</span>
                                        ) : (
                                            <button onClick={() => handleDispenseItem(item.id)} className="inline-flex items-center gap-1 bg-[#c5a059] text-[#1e3a29] font-bold text-xs px-3 py-1.5 rounded hover:bg-[#b08d4b]">Dispense</button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
});
QueueItem.displayName = "QueueItem";


export default function PharmacyClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'queue' | 'inventory' | 'history'>('queue');
  const [inventory, setInventory] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [historyResults, setHistoryResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventorySearch, setInventorySearch] = useState("");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  
  const [historySearch, setHistorySearch] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" }); 
  const [isSearchingHistory, setIsSearchingHistory] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ 
      name: "", stock: "", price: "", minStock: "", mfgDate: "", expDate: "", type: "" 
  }); 

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMed, setNewMed] = useState({ 
    name: "", type: "Tablet", stock: "0", price: "0", minStock: "10", mfgDate: "", expDate: ""
  });

  const [dispenseQtys, setDispenseQtys] = useState<{[key: string]: string}>({});
  const [discounts, setDiscounts] = useState<{[key: string]: string}>({});
  const [discountTypes, setDiscountTypes] = useState<{[key: string]: 'PERCENT' | 'VALUE'}>({});

  // --- Walk-in / Guest State ---
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [walkInCart, setWalkInCart] = useState<any[]>([]);
  const [walkInSearch, setWalkInSearch] = useState("");
  const [walkInDetails, setWalkInDetails] = useState({ patientName: "", phone: "", patientId: "", discount: "" });
  const [isGuest, setIsGuest] = useState(false);
  
  const [patientSuggestions, setPatientSuggestions] = useState<any[]>([]);
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const patientSearchRef = useRef<HTMLDivElement>(null);

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
             // Only set default if not present
             if (!initialQtys[i.id]) {
                 initialQtys[i.id] = i.dispensedQty ? i.dispensedQty.toString() : "1"; 
             }
          });
        });
      });
      setDispenseQtys(prev => ({...prev, ...initialQtys}));
    } catch (e) {
      console.error("Error loading pharmacy data", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = useMemo(() => {
    return inventory.filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(inventorySearch.toLowerCase());
        const isLowStock = m.stock < (m.minStock || 10);
        return showLowStockOnly ? (matchesSearch && isLowStock) : matchesSearch;
    });
  }, [inventory, inventorySearch, showLowStockOnly]);

  const inventoryMap = useMemo(() => {
      const map = new Map();
      inventory.forEach(item => map.set(item.name, item));
      return map;
  }, [inventory]);

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

  const printConsultationBill = async (consult: any) => {
     const fee = 500 - (consult.discount || 0);
     const items = [{
        name: "Consultation Charge",
        qty: 1,
        amount: fee
     }];

     const dateStr = new Date(consult.createdAt).toISOString().slice(0,10).replace(/-/g, "");
     const uniqueId = consult.id.slice(-4).toUpperCase();
     const billNo = `OPD-${dateStr}-${uniqueId}`;

     const billDate = consult.appointment?.date 
        ? new Date(consult.appointment.date).toLocaleDateString() 
        : new Date(consult.createdAt).toLocaleDateString();

     await generateBill({
       billNo,
       date: billDate, 
       patientName: consult.patient.name,
       patientId: consult.patient.readableId || consult.patient.id.slice(0,6),
       appointmentId: consult.appointment?.readableId || "WALK-IN",
       doctorName: consult.doctorName || "Dr. Chirag Raval",
       items
    });
  };

  const printPharmacyBill = async (consult: any, isReprint = false) => {
    let subTotal = 0;
    const items = consult.prescriptions[0]?.items.map((item: any) => {
       const qty = isReprint 
          ? (item.dispensedQty || 1) 
          : parseInt(dispenseQtys[item.id] || (item.dispensedQty ? item.dispensedQty.toString() : "1"));

       const medInfo = inventoryMap.get(item.medicine?.name);
       const unitPrice = medInfo?.price || 0;
       const lineTotal = unitPrice * qty;
       
       subTotal += lineTotal;

       return {
          name: `${item.medicine?.name || "Medicine"} (${item.unit || '-'})`,
          qty: qty,
          amount: lineTotal
       };
    }) || [];

    if(items.length === 0) return alert("No pharmacy items to bill");

    // ✅ CRITICAL FIX: DISCOUNT LOGIC FOR BILLING
    const inputDiscount = parseFloat(discounts[consult.id] || "0");
    const dbDiscount = parseFloat(consult.discount || "0");
    // If reprint (History) or input empty, use DB discount
    const effectiveDiscount = (isReprint && inputDiscount === 0) ? dbDiscount : inputDiscount;
    const discType = discountTypes[consult.id] || 'PERCENT';
    
    let discountAmount = 0;
    
    if (effectiveDiscount > 0) {
        if (isReprint && inputDiscount === 0) {
             // For reprints from history, use flat DB amount
             discountAmount = effectiveDiscount;
             items.push({
                name: `PHARMACY DISCOUNT (Flat)`,
                qty: 1,
                amount: -discountAmount
            });
        } else {
             // Live calculation
             if (discType === 'PERCENT') {
                discountAmount = (subTotal * effectiveDiscount) / 100;
                items.push({
                    name: `PHARMACY DISCOUNT (${effectiveDiscount}%)`,
                    qty: 1,
                    amount: -discountAmount
                });
             } else {
                discountAmount = effectiveDiscount;
                items.push({
                    name: `PHARMACY DISCOUNT (Flat)`,
                    qty: 1,
                    amount: -discountAmount
                });
             }
        }
    }

    const dateStr = new Date(consult.createdAt).toISOString().slice(0,10).replace(/-/g, "");
    const uniqueId = consult.id.slice(-4).toUpperCase();
    const billNo = `PH-${dateStr}-${uniqueId}`;

    const billDate = consult.appointment?.date 
        ? new Date(consult.appointment.date).toLocaleDateString() 
        : new Date(consult.createdAt).toLocaleDateString();

    await generateBill({
       billNo,
       date: billDate,
       patientName: consult.patient.name,
       patientId: consult.patient.readableId || consult.patient.id.slice(0,6),
       appointmentId: consult.appointment?.readableId || "WALK-IN",
       doctorName: consult.doctorName || "Dr. Chirag Raval",
       items
    });
  };

  // ... [Handlers logic] ...
  const handleQtyChange = (itemId: string, val: string) => {
    setDispenseQtys(prev => ({...prev, [itemId]: val}));
  };

  const handleDiscountChange = (consultId: string, val: string) => {
    setDiscounts(prev => ({...prev, [consultId]: val}));
  };

  const toggleDiscountType = (consultId: string) => {
      setDiscountTypes(prev => ({
          ...prev,
          [consultId]: prev[consultId] === 'VALUE' ? 'PERCENT' : 'VALUE'
      }));
  };

  const handleDispenseItem = async (itemId: string, qtyOverride?: number) => {
    const qtyToDeduct = qtyOverride || parseInt(dispenseQtys[itemId]) || 1;
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
        const qty = parseInt(dispenseQtys[item.id] || "1");
        await handleDispenseItem(item.id, qty);
      }
    }
  };

  const handleReopen = async (consultId: string) => {
    if(!confirm("Are you sure you want to reopen this item? It will move back to the Live Queue for correction.")) return;
    setLoading(true);
    const result = await reopenConsultation(consultId);
    setLoading(false);
    if (result.success) {
        alert("Moved back to Live Queue successfully.");
        switchTab('queue'); 
        loadData();
    } else {
        alert("Failed to reopen: " + result.error);
    }
  };

  const handleDeleteHistoryRecord = async (consultId: string, patientId: string) => {
      if(!confirm("⚠️ Delete this record permanently?\nThis will remove it from history and reports.")) return;
      setLoading(true);
      await deleteVisit(consultId, patientId);
      setHistoryResults(prev => prev.filter(h => h.id !== consultId));
      setLoading(false);
  };

  const handleAddNew = async () => {
    await createMedicine(newMed);
    setIsAddModalOpen(false);
    setNewMed({ name: "", type: "Tablet", stock: "0", price: "0", minStock: "10", mfgDate: "", expDate: "" });
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
    setEditForm({ 
        name: med.name, 
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

  useEffect(() => {
    if (isGuest) return; 
    const t = setTimeout(async () => {
      if (walkInDetails.patientName.length > 1 && !walkInDetails.patientId) {
        setPatientSuggestions(await searchPatients(walkInDetails.patientName));
        setShowPatientSearch(true);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [walkInDetails.patientName, isGuest]);

  const selectPatient = (p: any) => {
    setWalkInDetails({ ...walkInDetails, patientName: p.name, phone: p.phone, patientId: p.id });
    setShowPatientSearch(false);
  };

  const addToWalkInCart = (med: any) => {
    if (walkInCart.find(i => i.id === med.id)) return alert("Item already in cart");
    setWalkInCart([...walkInCart, { ...med, qty: 1 }]);
    setWalkInSearch(""); 
  };

  const removeFromWalkInCart = (index: number) => {
    const newCart = [...walkInCart];
    newCart.splice(index, 1);
    setWalkInCart(newCart);
  };

  const updateWalkInQty = (index: number, val: string) => {
    const newCart = [...walkInCart];
    newCart[index].qty = parseInt(val) || 1;
    setWalkInCart(newCart);
  };

  const handleWalkInCheckout = async () => {
    if (walkInCart.length === 0) return alert("Cart is empty");
    if (!walkInDetails.patientName) return alert("Please enter Patient Name");

    if (!isGuest && !walkInDetails.patientId) return alert("Please select a registered patient.");

    const visitData = {
        doctorName: "Pharmacy Direct Sale",
        diagnosis: "Direct Medicine Purchase",
        prescriptions: walkInCart.map(item => ({
            medicineId: item.id,
            dosage: "-",
            unit: item.type,
            duration: "N/A",
            instruction: "Direct Sale",
            panchkarma: null
        })),
        guestName: isGuest ? walkInDetails.patientName : undefined 
    };

    const targetPatientId = isGuest ? "GUEST" : walkInDetails.patientId;

    await savePrescription(targetPatientId, visitData);

    for (const item of walkInCart) {
        const newStock = item.stock - item.qty;
        await updateMedicine(item.id, { 
            stock: newStock.toString(), 
            price: item.price.toString() 
        });
    }

    alert("Sale Completed! You can print bills from the Live Queue if needed.");
    
    setIsWalkInModalOpen(false);
    setWalkInCart([]);
    setWalkInDetails({ patientName: "", phone: "", patientId: "", discount: "" });
    setIsGuest(false); 
    loadData();
  };

  return (
    <div className="h-screen bg-[#FDFBF7] flex flex-col font-sans text-neutral-800 overflow-hidden">
      <StaffHeader />
      
      <div className="bg-white border-b px-8 py-4 flex justify-between items-center shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
           <div className="bg-[#1e3a29] text-white p-2 rounded-lg"><Pill size={24} /></div>
           <h1 className="text-xl font-serif font-bold text-[#1e3a29]">Pharmacy Dashboard</h1>
        </div>
        
        <div className="flex gap-4">
            <button 
                onClick={() => setIsWalkInModalOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md transition"
            >
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
            {activeTab === 'queue' && (
              <div className="max-w-6xl mx-auto space-y-4">
                {queue.length === 0 ? (
                   <div className="text-center py-20 text-gray-400 border-2 border-dashed rounded-xl">
                     <Clock className="mx-auto mb-2 text-gray-300" size={40}/>
                     No active patients waiting.
                   </div>
                ) : (
                   queue.map((consult) => (
                      <QueueItem 
                         key={consult.id}
                         consult={consult}
                         dispenseQtys={dispenseQtys}
                         handleQtyChange={handleQtyChange}
                         discounts={discounts}
                         discountTypes={discountTypes}
                         handleDiscountChange={handleDiscountChange}
                         toggleDiscountType={toggleDiscountType}
                         printConsultationBill={printConsultationBill}
                         printPharmacyBill={printPharmacyBill}
                         handleDispenseAll={handleDispenseAll}
                         handleDispenseItem={handleDispenseItem}
                      />
                   ))
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="max-w-5xl mx-auto">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                     <div className="relative w-full md:w-1/3">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                        <input 
                          type="text" 
                          placeholder="Search Name, Phone or ID..." 
                          className="w-full pl-10 p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#c5a059]"
                          value={historySearch}
                          onChange={(e) => setHistorySearch(e.target.value)}
                        />
                     </div>
                     <div className="flex items-center gap-2 w-full md:w-auto">
                        <input type="date" className="p-2 border rounded-lg text-sm" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
                        <span className="text-gray-400">-</span>
                        <input type="date" className="p-2 border rounded-lg text-sm" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
                     </div>
                     {isSearchingHistory && <Loader2 className="animate-spin text-[#c5a059]" size={20}/>}
                  </div>

                  <div className="space-y-4">
                     {historyResults.length === 0 ? (
                        <div className="text-center text-gray-400 py-10 border-2 border-dashed rounded-xl bg-gray-50">
                           {historySearch || dateRange.start ? "No records found matching your filters." : "No recent dispensed history found."}
                        </div>
                     ) : (
                        historyResults.map((consult) => (
                           <QueueItem 
                              key={consult.id}
                              consult={consult}
                              dispenseQtys={dispenseQtys}
                              handleQtyChange={() => {}} 
                              discounts={{}}
                              discountTypes={{}}
                              handleDiscountChange={() => {}}
                              toggleDiscountType={() => {}}
                              printConsultationBill={printConsultationBill}
                              printPharmacyBill={printPharmacyBill}
                              handleDispenseAll={() => {}}
                              handleDispenseItem={() => {}}
                              isHistory={true}
                              handleReopen={handleReopen}
                              handleDeleteHistoryRecord={handleDeleteHistoryRecord}
                           />
                        ))
                     )}
                  </div>
              </div>
            )}

            {/* Inventory Tab */}
            {activeTab === 'inventory' && (
              <div className="max-w-6xl mx-auto">
                <div className="flex justify-between mb-6">
                   <div className="relative w-96">
                     <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                     <input type="text" placeholder="Search medicines..." className="w-full pl-10 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#c5a059] outline-none" value={inventorySearch} onChange={(e) => setInventorySearch(e.target.value)}/>
                   </div>
                   <div className="flex gap-2">
                     <button onClick={loadData} className="p-2 bg-white border rounded hover:bg-gray-50 text-gray-600"><RefreshCw size={18}/></button>
                     <button 
                        onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                        className={`p-2 border rounded flex items-center gap-2 text-sm font-bold transition ${showLowStockOnly ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                     >
                        <Filter size={16}/> Low Stock
                     </button>
                     <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-[#1e3a29] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#162b1e]"><Plus size={16}/> Add New</button>
                   </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#1e3a29] text-white text-xs uppercase">
                      <tr>
                        <th className="p-4 font-medium">Name</th>
                        <th className="p-4 font-medium">Type</th>
                        <th className="p-4 font-medium">Stock / Min</th>
                        <th className="p-4 font-medium">Dates (Mfg / Exp)</th>
                        <th className="p-4 font-medium">Price (₹)</th>
                        <th className="p-4 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredInventory.map((med) => (
                        <InventoryRow 
                            key={med.id} 
                            med={med} 
                            editingId={editingId} 
                            editForm={editForm} 
                            setEditForm={setEditForm} 
                            handleEdit={handleEdit} 
                            saveEdit={saveEdit} 
                            handleDelete={handleDelete} 
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Walk In Modal */}
            {isWalkInModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex overflow-hidden animate-in zoom-in-95">
                    <div className="w-1/2 border-r bg-gray-50 flex flex-col">
                       <div className="p-4 border-b bg-white">
                          <h3 className="font-bold text-lg text-[#1e3a29] mb-3">Select Medicine</h3>
                          <div className="relative">
                             <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                             <input autoFocus type="text" placeholder="Search to add..." className="w-full pl-10 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={walkInSearch} onChange={(e) => setWalkInSearch(e.target.value)} />
                          </div>
                       </div>
                       <div className="flex-1 overflow-y-auto p-2">
                          {inventory.filter(m => m.name.toLowerCase().includes(walkInSearch.toLowerCase())).slice(0, 20).map(med => (
                             <button key={med.id} onClick={() => addToWalkInCart(med)} className="w-full text-left p-3 mb-2 bg-white border rounded-lg hover:border-blue-500 hover:shadow-sm transition group">
                                <div className="flex justify-between"><span className="font-bold text-[#1e3a29]">{med.name}</span><span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">Stock: {med.stock}</span></div>
                                <div className="text-xs text-gray-500 mt-1 flex justify-between"><span>{med.type}</span><span className="font-bold text-green-600">₹{med.price}</span></div>
                             </button>
                          ))}
                       </div>
                    </div>
                    <div className="w-1/2 flex flex-col bg-white">
                       <div className="p-4 border-b flex justify-between items-center bg-[#1e3a29] text-white">
                          <h3 className="font-bold text-lg">Direct Sale (Walk-in)</h3>
                          <button onClick={() => setIsWalkInModalOpen(false)} className="hover:text-red-300"><X size={20}/></button>
                       </div>
                       <div className="flex-1 overflow-y-auto p-4 space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                             <input type="checkbox" id="guestCheck" checked={isGuest} onChange={(e) => { setIsGuest(e.target.checked); setWalkInDetails(prev => ({...prev, patientId: "", patientName: ""})); }} className="w-4 h-4 text-[#1e3a29] focus:ring-[#1e3a29] border-gray-300 rounded" />
                             <label htmlFor="guestCheck" className="text-sm font-bold text-gray-600 select-none cursor-pointer">Guest (Not a Patient)</label>
                          </div>
                          {isGuest ? (
                             <div className="flex items-center border rounded p-2 focus-within:ring-2 focus-within:ring-blue-500">
                                <User size={18} className="text-gray-400 mr-2"/>
                                <input placeholder="Enter Guest Name *" className="flex-1 text-sm outline-none" value={walkInDetails.patientName} onChange={e => setWalkInDetails({...walkInDetails, patientName: e.target.value})} />
                             </div>
                          ) : (
                             <div className="relative" ref={patientSearchRef}>
                                <div className="flex items-center border rounded p-2 focus-within:ring-2 focus-within:ring-blue-500">
                                   <Search size={18} className="text-gray-400 mr-2"/>
                                   <input placeholder="Search Patient Name *" className="flex-1 text-sm outline-none" value={walkInDetails.patientName} onChange={e => setWalkInDetails({...walkInDetails, patientName: e.target.value, patientId: ""})} />
                                </div>
                                {showPatientSearch && patientSuggestions.length > 0 && (
                                   <div className="absolute top-full left-0 w-full bg-white border shadow-lg rounded mt-1 z-50 max-h-40 overflow-y-auto">
                                      {patientSuggestions.map(p => (
                                         <div key={p.id} onClick={() => selectPatient(p)} className="p-2 text-sm hover:bg-gray-100 cursor-pointer border-b">
                                            <div className="font-bold text-[#1e3a29]">{p.name}</div><div className="text-xs text-gray-500">{p.phone}</div>
                                         </div>
                                      ))}
                                   </div>
                                )}
                             </div>
                          )}
                          <input placeholder="Phone (Optional)" className="w-full p-2 border rounded text-sm outline-none bg-gray-50" value={walkInDetails.phone} onChange={e => setWalkInDetails({...walkInDetails, phone: e.target.value})} readOnly={!isGuest} />
                          <div className="border rounded-lg overflow-hidden">
                             <table className="w-full text-sm">
                                <thead className="bg-gray-100 text-xs uppercase text-gray-500"><tr><th className="p-2 text-left">Item</th><th className="p-2 w-16">Qty</th><th className="p-2 text-right">Total</th><th className="p-2 w-8"></th></tr></thead>
                                <tbody className="divide-y">
                                   {walkInCart.length === 0 ? (<tr><td colSpan={4} className="p-8 text-center text-gray-400 italic">Cart is empty</td></tr>) : (
                                      walkInCart.map((item, idx) => (
                                         <tr key={idx}>
                                            <td className="p-2"><div className="font-medium">{item.name}</div><div className="text-[10px] text-gray-500">₹{item.price}</div></td>
                                            <td className="p-2"><input type="number" min="1" className="w-12 p-1 border rounded text-center outline-none" value={item.qty} onChange={(e) => updateWalkInQty(idx, e.target.value)} /></td>
                                            <td className="p-2 text-right font-bold">₹{item.price * item.qty}</td>
                                            <td className="p-2 text-center"><button onClick={() => removeFromWalkInCart(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button></td>
                                         </tr>
                                      ))
                                   )}
                                </tbody>
                             </table>
                          </div>
                       </div>
                       <div className="p-4 border-t bg-gray-50 space-y-3">
                          <div className="flex justify-between items-center text-sm"><span className="font-bold text-gray-600">Subtotal:</span><span>₹{walkInCart.reduce((acc, i) => acc + (i.price * i.qty), 0)}</span></div>
                          <div className="flex justify-between items-center text-sm"><span className="font-bold text-gray-600 flex items-center gap-1"><BadgePercent size={14}/> Discount (%):</span><input type="number" placeholder="0" className="w-20 p-1 border rounded text-right outline-none" value={walkInDetails.discount} onChange={e => setWalkInDetails({...walkInDetails, discount: e.target.value})} /></div>
                          <div className="flex justify-between items-center text-lg font-bold text-[#1e3a29] border-t pt-2"><span>Grand Total:</span><span>{(() => { const sub = walkInCart.reduce((acc, i) => acc + (i.price * i.qty), 0); const discPercent = parseFloat(walkInDetails.discount) || 0; const discAmount = (sub * discPercent) / 100; return `₹${(sub - discAmount).toFixed(2)}`; })()}</span></div>
                          <button onClick={handleWalkInCheckout} className="w-full bg-[#1e3a29] text-white py-3 rounded-lg font-bold text-sm hover:bg-[#162b1e] transition shadow-md flex justify-center items-center gap-2"><CheckCircle size={16}/> Complete Sale</button>
                       </div>
                    </div>
                  </div>
              </div>
            )}
            
            {/* Add Modal */}
            {isAddModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-xl p-6 w-[500px] shadow-2xl animate-in zoom-in">
                  <h2 className="text-xl font-bold mb-6 text-[#1e3a29]">Add New Medicine</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Medicine Name</label>
                      <input className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-[#c5a059] outline-none" placeholder="e.g. Paracetamol" value={newMed.name} onChange={e => setNewMed({...newMed, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Type</label>
                            <select className="w-full p-2 border rounded text-sm bg-white focus:ring-2 focus:ring-[#c5a059] outline-none" value={newMed.type} onChange={e => setNewMed({...newMed, type: e.target.value})}>
                               {MEDICINE_TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Initial Stock</label>
                            <input className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-[#c5a059] outline-none" type="number" placeholder="0" value={newMed.stock} onChange={e => setNewMed({...newMed, stock: e.target.value})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Price (₹)</label>
                            <input className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-[#c5a059] outline-none" type="number" placeholder="0" value={newMed.price} onChange={e => setNewMed({...newMed, price: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase mb-1 text-red-500">Min. Stock Alert</label>
                            <input className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-red-300 outline-none" type="number" placeholder="10" value={newMed.minStock} onChange={e => setNewMed({...newMed, minStock: e.target.value})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Mfg. Date</label>
                            <input className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-[#c5a059] outline-none" type="date" value={newMed.mfgDate} onChange={e => setNewMed({...newMed, mfgDate: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Exp. Date</label>
                            <input className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-[#c5a059] outline-none" type="date" value={newMed.expDate} onChange={e => setNewMed({...newMed, expDate: e.target.value})} />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
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