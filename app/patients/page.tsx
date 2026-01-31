"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StaffHeader from "@/app/components/StaffHeader";
import { 
  Users, Search, Plus, Edit2, Trash2, 
  ChevronRight, Loader2, X, Filter, ChevronDown, ChevronUp, Wallet 
} from "lucide-react";
import { getPatients, createPatient, updatePatient, deletePatient, updatePatientWallet } from "@/app/actions";

// Template for Physical Generals
const PHYSICAL_GENERALS_TEMPLATE = `Appetite : 
Thirst : 
Craving : 
Aversion : 
Taste : Sweet [ ], Spicy [ ], Sour [ ], Salty [ ]
Thermal : 
Perspiration : 
Bowels : 
Urine : 
Sleep : 
Dreams : 
Fears : `;

export default function PatientManager() {
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  
  // Patient Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any>(null);
  const [showExtendedForm, setShowExtendedForm] = useState(false); 
  
  // Wallet Modal State
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [walletPatient, setWalletPatient] = useState<any>(null);
  const [walletAmount, setWalletAmount] = useState("");
  const [walletType, setWalletType] = useState<"CREDIT" | "DUE">("CREDIT");

  // Form State
  const [formData, setFormData] = useState({
    name: "", phone: "", age: "", gender: "Male",
    bloodGroup: "", prakriti: "", 
    initialWeight: "", currentWeight: "", history: "",
    chiefComplaints: "", kco: "", currentMedications: "", investigations: "",
    pastHistory: "", familyHistory: "", mentalGenerals: "", obsGynHistory: "",
    physicalGenerals: PHYSICAL_GENERALS_TEMPLATE
  });

  // --- Load Data ---
  const loadPatients = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const data = await getPatients(query);
      setPatients(data);
    } catch (e) {
      console.error("Failed to load patients", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadPatients(search);
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [search, loadPatients]);

  // --- Handlers ---
  const handleOpenModal = (patient?: any) => {
    if (patient) {
      setEditingPatient(patient);
      setFormData({
        name: patient.name,
        phone: patient.phone,
        age: patient.age?.toString() || "",
        gender: patient.gender || "Male",
        bloodGroup: patient.bloodGroup || "",
        prakriti: patient.prakriti || "",
        initialWeight: patient.initialWeight || "",
        currentWeight: patient.currentWeight || "",
        history: patient.history || "",
        chiefComplaints: patient.chiefComplaints || "",
        kco: patient.kco || "",
        currentMedications: patient.currentMedications || "",
        investigations: patient.investigations || "",
        pastHistory: patient.pastHistory || "",
        familyHistory: patient.familyHistory || "",
        mentalGenerals: patient.mentalGenerals || "",
        obsGynHistory: patient.obsGynHistory || "",
        physicalGenerals: patient.physicalGenerals || PHYSICAL_GENERALS_TEMPLATE
      });
    } else {
      setEditingPatient(null);
      setFormData({
        name: "", phone: "", age: "", gender: "Male",
        bloodGroup: "", prakriti: "", 
        initialWeight: "", currentWeight: "", history: "",
        chiefComplaints: "", kco: "", currentMedications: "", investigations: "",
        pastHistory: "", familyHistory: "", mentalGenerals: "", obsGynHistory: "",
        physicalGenerals: PHYSICAL_GENERALS_TEMPLATE
      });
    }
    setShowExtendedForm(false); 
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    let res: any;
    
    const cleanData = {
        ...formData,
        age: formData.age ? parseInt(formData.age) : 0,
        initialWeight: formData.initialWeight || null,
        currentWeight: formData.currentWeight || null
    };

    if (editingPatient) {
      res = await updatePatient(editingPatient.id, cleanData);
    } else {
      res = await createPatient(cleanData);
    }

    setSaving(false);

    if (res.success) {
      setIsModalOpen(false);
      if (!editingPatient && res.patient?.id) {
          router.push(`/patients/${res.patient.id}`);
      } else {
          loadPatients(search); 
      }
    } else {
      alert(res.error || "Operation failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure? This will delete all history for this patient.")) {
      await deletePatient(id);
      loadPatients(search);
    }
  };

  // --- Wallet Handlers ---
  const handleOpenWallet = (patient: any) => {
      setWalletPatient(patient);
      setWalletAmount("");
      setWalletType("CREDIT");
      setIsWalletModalOpen(true);
  };

  const handleWalletUpdate = async () => {
      if (!walletAmount || parseFloat(walletAmount) <= 0) return alert("Enter valid amount");
      
      const res = await updatePatientWallet(walletPatient.id, parseFloat(walletAmount), walletType);
      
      if (res.success) {
          setIsWalletModalOpen(false);
          loadPatients(search); // Refresh list
      } else {
          alert("Failed to update wallet");
      }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans text-neutral-800">
      <StaffHeader />

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        
        {/* --- Header --- */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-[#1e3a29] flex items-center gap-3">
              <Users className="text-[#c5a059]" /> Patient Management
            </h1>
            <p className="text-gray-500 text-sm mt-1">Manage profiles, history, and vitals.</p>
          </div>
          
          <button 
            onClick={() => handleOpenModal()}
            className="bg-[#1e3a29] text-white px-6 py-2.5 rounded-lg font-bold shadow-lg hover:bg-[#162b1e] transition flex items-center gap-2"
          >
            <Plus size={18} /> Add New Patient
          </button>
        </div>

        {/* --- Search & Filters --- */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex gap-4">
           <div className="relative flex-1">
             <Search className="absolute left-3 top-3 text-gray-400" size={18} />
             <input 
               type="text" 
               placeholder="Search by Name, Phone or ID..." 
               className="w-full pl-10 p-2.5 border rounded-lg text-sm focus:outline-none focus:border-[#c5a059]"
               value={search}
               onChange={(e) => setSearch(e.target.value)}
             />
           </div>
           <button className="p-2.5 border rounded-lg hover:bg-gray-50 text-gray-600">
             <Filter size={18} />
           </button>
        </div>

        {/* --- Patient Table --- */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#1e3a29] text-white uppercase text-xs">
                <tr>
                  <th className="p-4">ID</th>
                  <th className="p-4">Name / Phone</th>
                  <th className="p-4">Details</th>
                  <th className="p-4">Prakriti</th>
                  <th className="p-4">Weight (Cur/Init)</th>
                  <th className="p-4 text-center">Wallet</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={7} className="p-8 text-center"><Loader2 className="animate-spin inline text-[#c5a059]"/></td></tr>
                ) : patients.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-gray-400">No patients found.</td></tr>
                ) : (
                  patients.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 group transition">
                      <td className="p-4 font-mono font-bold text-[#c5a059]">{p.readableId || "N/A"}</td>
                      
                      <td className="p-4">
                        <div className="font-bold text-[#1e3a29]">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.phone}</div>
                      </td>
                      
                      <td className="p-4 text-gray-600">
                        {p.age} Y / {p.gender} / {p.bloodGroup || "-"}
                      </td>
                      
                      <td className="p-4 font-medium text-purple-700">
                        {p.prakriti || <span className="text-gray-300">-</span>}
                      </td>
                      
                      <td className="p-4">
                        {p.currentWeight ? (
                          <span className="font-bold text-green-700">{p.currentWeight} <span className="text-gray-400 font-normal text-xs">/ {p.initialWeight}</span></span>
                        ) : "-"}
                      </td>

                      {/* Wallet Column */}
                      <td className="p-4 text-center">
                          {p.walletBalance !== undefined && p.walletBalance !== 0 ? (
                              <span className={`px-2 py-1 rounded text-xs font-bold ${p.walletBalance < 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                  {p.walletBalance < 0 ? `Due: ₹${Math.abs(p.walletBalance)}` : `Credit: ₹${p.walletBalance}`}
                              </span>
                          ) : (
                              <span className="text-gray-300 text-xs">₹0</span>
                          )}
                      </td>
                      
                      <td className="p-4 text-right flex justify-end gap-2">
                        {/* Wallet Action Button */}
                        <button onClick={() => handleOpenWallet(p)} className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100" title="Manage Wallet">
                            <Wallet size={16}/>
                        </button>

                        <Link href={`/patients/${p.id}`} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100" title="View Profile">
                          <ChevronRight size={16} />
                        </Link>
                        <button onClick={() => handleOpenModal(p)} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100" title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* --- ADD / EDIT MODAL (Existing Code Omitted for Brevity - It remains the same as provided) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in duration-200">
            <div className="bg-[#1e3a29] p-4 flex justify-between items-center text-white shrink-0">
              <h3 className="font-bold text-lg flex items-center gap-2">
                {editingPatient ? <Edit2 size={18}/> : <Plus size={18}/>} 
                {editingPatient ? "Edit Patient Details" : "Register New Patient"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="hover:text-[#c5a059]"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Full Name *</label>
                  <input required className="w-full p-2 border rounded focus:border-[#c5a059] outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Phone *</label>
                  <input required className="w-full p-2 border rounded focus:border-[#c5a059] outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Age</label>
                    <input type="number" className="w-full p-2 border rounded focus:border-[#c5a059] outline-none" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Gender</label>
                    <select className="w-full p-2 border rounded bg-white" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                      <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Blood Group</label>
                  <select className="w-full p-2 border rounded bg-white" value={formData.bloodGroup} onChange={e => setFormData({...formData, bloodGroup: e.target.value})}>
                    <option value="">Select...</option>
                    <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                    <option>O+</option><option>O-</option><option>AB+</option><option>AB-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-purple-600 mb-1">Prakriti (Dosha)</label>
                  <input placeholder="e.g. Vata-Pitta" className="w-full p-2 border rounded focus:border-purple-500 outline-none" value={formData.prakriti} onChange={e => setFormData({...formData, prakriti: e.target.value})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Initial Weight</label>
                    <input placeholder="e.g. 70 kg" className="w-full p-2 border rounded focus:border-[#c5a059] outline-none" value={formData.initialWeight} onChange={e => setFormData({...formData, initialWeight: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-green-600 mb-1">Current Weight</label>
                    <input placeholder="e.g. 68 kg" className="w-full p-2 border rounded border-green-200 bg-green-50 focus:border-green-500 outline-none" value={formData.currentWeight} onChange={e => setFormData({...formData, currentWeight: e.target.value})} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Basic History / Allergies</label>
                <textarea rows={2} className="w-full p-2 border rounded bg-gray-50 focus:bg-white focus:border-[#c5a059] outline-none" value={formData.history} onChange={e => setFormData({...formData, history: e.target.value})} />
              </div>

              <div className="border-t pt-4">
                 <button 
                    type="button" 
                    onClick={() => setShowExtendedForm(!showExtendedForm)}
                    className="flex items-center gap-2 text-sm font-bold text-[#c5a059] hover:underline w-full justify-center"
                 >
                    {showExtendedForm ? <><ChevronUp size={16}/> Hide Medical Details</> : <><ChevronDown size={16}/> Add Medical Details</>}
                 </button>

                 {showExtendedForm && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 bg-gray-50 p-4 rounded-lg animate-in slide-in-from-top-2 border">
                        <div className="md:col-span-2">
                           <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Chief Complaints</label>
                           <textarea rows={2} className="w-full p-2 border rounded text-sm" value={formData.chiefComplaints} onChange={e => setFormData({...formData, chiefComplaints: e.target.value})} />
                        </div>
                        
                        <div>
                           <label className="block text-xs font-bold uppercase text-gray-500 mb-1">K/C/O</label>
                           <input className="w-full p-2 border rounded text-sm" value={formData.kco} onChange={e => setFormData({...formData, kco: e.target.value})} />
                        </div>

                        <div>
                           <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Current Medications</label>
                           <input className="w-full p-2 border rounded text-sm" value={formData.currentMedications} onChange={e => setFormData({...formData, currentMedications: e.target.value})} />
                        </div>

                        <div className="md:col-span-2">
                           <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Investigations</label>
                           <textarea rows={2} className="w-full p-2 border rounded text-sm" value={formData.investigations} onChange={e => setFormData({...formData, investigations: e.target.value})} />
                        </div>

                        <div><label className="block text-xs font-bold uppercase text-gray-500 mb-1">Past History</label><textarea rows={2} className="w-full p-2 border rounded text-sm" value={formData.pastHistory} onChange={e => setFormData({...formData, pastHistory: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold uppercase text-gray-500 mb-1">Family History</label><textarea rows={2} className="w-full p-2 border rounded text-sm" value={formData.familyHistory} onChange={e => setFormData({...formData, familyHistory: e.target.value})} /></div>
                        
                        <div><label className="block text-xs font-bold uppercase text-gray-500 mb-1">Mental Generals</label><textarea rows={2} className="w-full p-2 border rounded text-sm" value={formData.mentalGenerals} onChange={e => setFormData({...formData, mentalGenerals: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold uppercase text-gray-500 mb-1">OBS/GYN History</label><textarea rows={2} className="w-full p-2 border rounded text-sm" value={formData.obsGynHistory} onChange={e => setFormData({...formData, obsGynHistory: e.target.value})} /></div>

                        <div className="md:col-span-2">
                           <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Physical Generals</label>
                           <textarea 
                              className="w-full p-2 border rounded text-xs font-mono h-48 bg-white" 
                              value={formData.physicalGenerals} 
                              onChange={e => setFormData({...formData, physicalGenerals: e.target.value})} 
                           />
                        </div>
                    </div>
                 )}
              </div>

              <div className="pt-4 border-t flex justify-end gap-3 shrink-0 bg-white sticky bottom-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-bold">Cancel</button>
                <button 
                    type="submit" 
                    disabled={saving}
                    className="px-6 py-2 bg-[#1e3a29] text-white rounded-lg text-sm font-bold hover:bg-[#162b1e] flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={16}/> : (editingPatient ? "Update Details" : "Register Patient")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✅ WALLET UPDATE MODAL */}
      {isWalletModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95">
                  <h3 className="text-lg font-bold text-[#1e3a29] mb-4 flex items-center gap-2"><Wallet/> Update Wallet</h3>
                  <p className="text-sm text-gray-500 mb-4">Managing balance for <span className="font-bold text-black">{walletPatient?.name}</span></p>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Transaction Type</label>
                          <select 
                              className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-[#c5a059]"
                              value={walletType}
                              onChange={(e) => setWalletType(e.target.value as "CREDIT" | "DUE")}
                          >
                              <option value="CREDIT">Credit (Deposit / Advance)</option>
                              <option value="DUE">Due (Charge / Debt)</option>
                          </select>
                      </div>

                      <div>
                          <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Amount (₹)</label>
                          <input 
                              type="number" 
                              autoFocus
                              placeholder="Enter Amount" 
                              className="w-full p-3 border rounded-lg text-lg font-bold outline-none focus:ring-2 focus:ring-[#c5a059]"
                              value={walletAmount}
                              onChange={(e) => setWalletAmount(e.target.value)}
                          />
                      </div>
                  </div>
                  
                  <div className="flex gap-3 mt-6">
                      <button onClick={() => setIsWalletModalOpen(false)} className="flex-1 py-2 text-gray-600 font-bold bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                      <button 
                          onClick={handleWalletUpdate} 
                          className={`flex-1 py-2 text-white font-bold rounded-lg transition ${walletType === 'CREDIT' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                      >
                          {walletType === 'CREDIT' ? 'Add Credit' : 'Add Due'}
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}