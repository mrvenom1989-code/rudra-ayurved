"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import StaffHeader from "@/app/components/StaffHeader";
import { 
  Users, Search, Plus, Edit2, Trash2, 
  ChevronRight, Loader2, X, Filter 
} from "lucide-react";
import { getPatients, createPatient, updatePatient, deletePatient } from "@/app/actions";

export default function PatientManager() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: "", phone: "", age: "", gender: "Male",
    bloodGroup: "", prakriti: "", 
    initialWeight: "", currentWeight: "", history: ""
  });

  // --- Load Data (Stable Version) ---
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

  // Debounced Search Effect
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
        history: patient.history || ""
      });
    } else {
      setEditingPatient(null);
      setFormData({
        name: "", phone: "+91 ", age: "", gender: "Male",
        bloodGroup: "", prakriti: "", 
        initialWeight: "", currentWeight: "", history: ""
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let res;
    if (editingPatient) {
      res = await updatePatient(editingPatient.id, formData);
    } else {
      res = await createPatient(formData);
    }

    if (res.success) {
      setIsModalOpen(false);
      loadPatients(search); // Reload list
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
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="animate-spin inline text-[#c5a059]"/></td></tr>
                ) : patients.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-400">No patients found.</td></tr>
                ) : (
                  patients.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 group transition">
                      {/* Readable ID */}
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
                      
                      <td className="p-4 text-right flex justify-end gap-2">
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

      {/* --- ADD / EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-[#1e3a29] p-4 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg flex items-center gap-2">
                {editingPatient ? <Edit2 size={18}/> : <Plus size={18}/>} 
                {editingPatient ? "Edit Patient Details" : "Register New Patient"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="hover:text-[#c5a059]"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Basic Info */}
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

                {/* Ayurveda Specifics */}
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
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Medical History / Allergies</label>
                <textarea rows={2} className="w-full p-2 border rounded bg-gray-50 focus:bg-white focus:border-[#c5a059] outline-none" value={formData.history} onChange={e => setFormData({...formData, history: e.target.value})} />
              </div>

              <div className="pt-4 border-t flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-bold">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-[#1e3a29] text-white rounded-lg text-sm font-bold hover:bg-[#162b1e]">
                  {editingPatient ? "Update Details" : "Register Patient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}