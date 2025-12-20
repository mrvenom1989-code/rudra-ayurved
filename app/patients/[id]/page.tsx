"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import StaffHeader from "@/app/components/StaffHeader"; 
import { 
  User, Phone, Calendar, Edit2, Save, Search, 
  Plus, FileText, Trash2, Stethoscope, Loader2, Check, X 
} from "lucide-react";

// 👇 IMPORT SERVER ACTIONS
import { 
  getPatientData, 
  getPharmacyInventory, 
  updatePatientDetails, 
  savePrescription, 
  searchPatients,
  deleteVisit
} from "../actions";

export default function PatientProfile() {
  const router = useRouter();
  const params = useParams();
  const patientId = params.id as string;

  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  
  // 🔍 SMART SEARCH STATES
  const [searchQuery, setSearchQuery] = useState("");
  const [patientSuggestions, setPatientSuggestions] = useState<any[]>([]);
  const [showPatientSearch, setShowPatientSearch] = useState(false);

  // 💊 MEDICINE SEARCH STATES
  const [inventory, setInventory] = useState<any[]>([]); 
  const [medQuery, setMedQuery] = useState(""); // Text typed in medicine box
  const [showMedList, setShowMedList] = useState(false);
  const medListRef = useRef<HTMLDivElement>(null); // To detect clicks outside

  // Patient Data
  const [patient, setPatient] = useState<any>(null);
  const [visitHistory, setVisitHistory] = useState<any[]>([]);

  // Current Visit (Draft)
  const [visitNote, setVisitNote] = useState(""); 
  const [currentPrescriptions, setCurrentPrescriptions] = useState<any[]>([]);
  const [newMed, setNewMed] = useState({
    medicineId: "", 
    medicineName: "",
    dosage: "1-0-1", 
    duration: "7 Days", 
    instruction: "After Food"
  });

  // --- 1. LOAD DATA ---
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [pData, pharmacyData] = await Promise.all([
          getPatientData(patientId),
          getPharmacyInventory()
        ]);

        if (pData) {
          setPatient(pData);
          // Map DB structure to UI structure
          const mappedHistory = (pData.consultations || []).map((c: any) => ({
            id: c.id,
            date: c.createdAt,
            diagnosis: c.diagnosis,
            prescriptions: c.prescriptions.flatMap((p: any) => 
              p.items.map((i: any) => ({
                id: i.id, 
                medicineName: i.medicine.name, 
                medicineId: i.medicineId,
                dosage: i.dosage,
                duration: i.duration,
                instruction: i.instruction
              }))
            )
          }));
          setVisitHistory(mappedHistory);
        }
        setInventory(pharmacyData || []);
      } catch (err) {
        console.error("Load Failed", err);
      } finally {
        setLoading(false);
      }
    }
    if(patientId) loadData();

    // Close med dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (medListRef.current && !medListRef.current.contains(event.target as Node)) {
        setShowMedList(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [patientId]);

  // --- 2. LIVE PATIENT SEARCH EFFECT ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 1) {
        const results = await searchPatients(searchQuery);
        setPatientSuggestions(results);
        setShowPatientSearch(true);
      } else {
        setPatientSuggestions([]);
        setShowPatientSearch(false);
      }
    }, 300); // 300ms delay to avoid spamming DB

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);


  // --- HANDLERS ---

  // Handle Patient Selection
  const selectPatient = (id: string) => {
    setSearchQuery("");
    setShowPatientSearch(false);
    router.push(`/patients/${id}`);
  };

  const handleSaveDetails = async () => {
    await updatePatientDetails(patientId, patient);
    setIsEditingDetails(false);
  };

  // 💊 Handle Medicine Selection
  const selectMedicine = (med: any) => {
    setNewMed({ ...newMed, medicineId: med.id, medicineName: med.name });
    setMedQuery(med.name); // Set input text to selected name
    setShowMedList(false); // Close dropdown
  };

  const handleAddMedicine = () => {
    if (!newMed.medicineId) return alert("Please select a valid medicine from the list");
    
    setCurrentPrescriptions([
      ...currentPrescriptions, 
      { ...newMed, id: Date.now() } 
    ]);
    
    // Reset inputs
    setNewMed({ ...newMed, medicineId: "", medicineName: "" }); 
    setMedQuery(""); // Clear search box
  };

  const removeDraftMedicine = (id: number) => {
    setCurrentPrescriptions(currentPrescriptions.filter(p => p.id !== id));
  };

  const handleSaveVisit = async () => {
    if (currentPrescriptions.length === 0 && !visitNote) {
      return alert("Please add medicines or a note before saving.");
    }
    const visitData = { diagnosis: visitNote, prescriptions: currentPrescriptions };
    const result = await savePrescription(patientId, visitData);
    
    if (result.success) {
      alert("Consultation Saved!");
      window.location.reload();
    } else {
      alert("Failed to save visit.");
    }
  };

  const handleDeleteHistory = async (id: string) => {
    if (confirm("Delete this consultation?")) {
      await deleteVisit(id, patientId);
      setVisitHistory(visitHistory.filter(v => v.id !== id));
    }
  };

  const handleEditHistory = (visit: any) => {
    if (currentPrescriptions.length > 0) {
      if(!confirm("Discard current unsaved changes?")) return;
    }
    setVisitNote(visit.diagnosis || "");
    const draftItems = visit.prescriptions.map((p: any) => ({
       id: Math.random(),
       medicineId: p.medicineId,
       medicineName: p.medicineName,
       dosage: p.dosage,
       duration: p.duration,
       instruction: p.instruction
    }));
    setCurrentPrescriptions(draftItems);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter Inventory based on search
  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(medQuery.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /> Loading...</div>;
  if (!patient) return <div className="p-10 text-center">Patient not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <StaffHeader />

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        
        {/* --- TOP BAR: SMART SEARCH --- */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 z-30 relative">
          <div>
            <h2 className="text-2xl font-serif font-bold text-[#1e3a29]">Patient Profile</h2>
            <p className="text-xs text-gray-500 uppercase tracking-widest">ID: {patientId.slice(0,6)}...</p>
          </div>
          
          <div className="relative w-full sm:w-96">
             <div className="relative">
               <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
               <input 
                 type="text" 
                 placeholder="Search Patient Name or Phone..." 
                 className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c5a059]"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 onFocus={() => searchQuery.length > 1 && setShowPatientSearch(true)}
                 // Delay blur to allow clicking on results
                 onBlur={() => setTimeout(() => setShowPatientSearch(false), 200)} 
               />
               {searchQuery && (
                 <button onClick={() => { setSearchQuery(""); setShowPatientSearch(false); }} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                    <X size={16} />
                 </button>
               )}
             </div>

             {/* PATIENT SUGGESTION DROPDOWN */}
             {showPatientSearch && patientSuggestions.length > 0 && (
                <div className="absolute top-full mt-2 left-0 w-full bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                   {patientSuggestions.map((p) => (
                      <button 
                        key={p.id}
                        onClick={() => selectPatient(p.id)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-0 flex justify-between items-center group transition-colors"
                      >
                         <div>
                            <p className="font-bold text-sm text-[#1e3a29] group-hover:text-[#c5a059]">{p.name}</p>
                            <p className="text-xs text-gray-500">{p.phone}</p>
                         </div>
                         <div className="text-gray-300 group-hover:text-[#c5a059]">
                            <Search size={14} />
                         </div>
                      </button>
                   ))}
                </div>
             )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* --- LEFT: PATIENT DETAILS --- */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-[#1e3a29] p-4 flex justify-between items-center">
                 <h3 className="text-white font-bold flex items-center gap-2"><User size={18} /> Personal Details</h3>
                 <button onClick={() => isEditingDetails ? handleSaveDetails() : setIsEditingDetails(true)} className="bg-[#c5a059] text-[#1e3a29] px-3 py-1 rounded text-xs font-bold">
                   {isEditingDetails ? "Save" : "Edit"}
                 </button>
              </div>
              <div className="p-6 space-y-4">
                {/* Editable Fields */}
                <div>
                   <label className="text-xs font-bold text-gray-400 uppercase">Name</label>
                   {isEditingDetails ? <input className="w-full border-b font-medium" value={patient.name} onChange={e => setPatient({...patient, name: e.target.value})} /> : <p className="font-bold text-xl">{patient.name}</p>}
                </div>
                <div className="flex gap-4">
                   <div className="flex-1"><label className="text-xs text-gray-400 uppercase">Age</label>
                   {isEditingDetails ? <input type="number" className="w-full border-b" value={patient.age || ""} onChange={e => setPatient({...patient, age: e.target.value})} /> : <p>{patient.age}</p>}</div>
                   <div className="flex-1"><label className="text-xs text-gray-400 uppercase">Gender</label>
                   {isEditingDetails ? <select className="w-full border-b" value={patient.gender || ""} onChange={e => setPatient({...patient, gender: e.target.value})}><option>Male</option><option>Female</option></select> : <p>{patient.gender}</p>}</div>
                </div>
                <div>
                   <label className="text-xs font-bold text-gray-400 uppercase">Phone</label>
                   {isEditingDetails ? <input className="w-full border-b" value={patient.phone} onChange={e => setPatient({...patient, phone: e.target.value})} /> : <div className="flex items-center gap-2"><Phone size={14} className="text-[#c5a059]" /> {patient.phone}</div>}
                </div>
                <div className="pt-4 border-t border-dashed">
                   <label className="text-xs font-bold text-red-400 uppercase">History / Allergies</label>
                   {isEditingDetails ? <textarea className="w-full bg-red-50 border-red-100 p-2 text-sm" rows={2} value={patient.history || ""} onChange={e => setPatient({...patient, history: e.target.value})} /> : <p className="text-sm font-medium text-red-600">{patient.history || "None"}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* --- RIGHT: PRESCRIBE --- */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* New Consultation */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative">
               <h3 className="font-bold text-[#1e3a29] flex items-center gap-2 mb-4"><Stethoscope className="text-[#c5a059]" /> New Consultation</h3>
               <div className="mb-4">
                  <textarea className="w-full p-3 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#c5a059] outline-none" rows={2} placeholder="Diagnosis / Symptoms..." value={visitNote} onChange={(e) => setVisitNote(e.target.value)} />
               </div>
               
               {/* 💊 MEDICINE INPUTS (Updated) */}
               <div className="grid grid-cols-12 gap-3 items-end bg-[#f8faf9] p-4 rounded-lg border border-gray-200">
                  
                  {/* SEARCHABLE MEDICINE DROPDOWN */}
                  <div className="col-span-12 md:col-span-4 relative" ref={medListRef}>
                     <label className="text-[10px] font-bold uppercase text-gray-500">Medicine</label>
                     <input 
                       type="text" 
                       placeholder="Search medicine..." 
                       className="w-full p-2 border rounded-md text-sm focus:border-[#c5a059] outline-none"
                       value={medQuery}
                       onChange={(e) => { setMedQuery(e.target.value); setShowMedList(true); }}
                       onFocus={() => setShowMedList(true)}
                     />
                     
                     {/* Filtered List */}
                     {showMedList && (
                       <div className="absolute top-full mt-1 left-0 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto z-40">
                         {filteredInventory.length === 0 ? (
                           <div className="p-2 text-xs text-gray-400 italic">No medicine found.</div>
                         ) : (
                           filteredInventory.map(item => (
                             <button 
                               key={item.id} 
                               onClick={() => selectMedicine(item)}
                               className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 text-[#1e3a29] border-b last:border-0"
                             >
                               {item.name} <span className="text-gray-400 text-xs">({item.stock})</span>
                             </button>
                           ))
                         )}
                       </div>
                     )}
                  </div>

                  <div className="col-span-6 md:col-span-2">
                     <label className="text-[10px] font-bold uppercase text-gray-500">Dosage</label>
                     <input type="text" placeholder="1-0-1" className="w-full p-2 border rounded text-sm" value={newMed.dosage} onChange={e => setNewMed({...newMed, dosage: e.target.value})} />
                  </div>
                  <div className="col-span-6 md:col-span-2">
                     <label className="text-[10px] font-bold uppercase text-gray-500">Duration</label>
                     <input type="text" placeholder="5 Days" className="w-full p-2 border rounded text-sm" value={newMed.duration} onChange={e => setNewMed({...newMed, duration: e.target.value})} />
                  </div>
                  <div className="col-span-12 md:col-span-3">
                     <label className="text-[10px] font-bold uppercase text-gray-500">Note</label>
                     <input type="text" placeholder="e.g. Before food" className="w-full p-2 border rounded text-sm" value={newMed.instruction} onChange={e => setNewMed({...newMed, instruction: e.target.value})} />
                  </div>
                  <div className="col-span-12 md:col-span-1">
                     <button onClick={handleAddMedicine} className="w-full h-[38px] bg-[#1e3a29] text-white rounded flex items-center justify-center hover:bg-[#162b1e]"><Plus size={20} /></button>
                  </div>
               </div>

               {/* Draft Table */}
               {currentPrescriptions.length > 0 && (
                 <div className="mt-4 border rounded-lg overflow-hidden">
                   {currentPrescriptions.map((p) => (
                     <div key={p.id} className="flex justify-between items-center p-3 border-b last:border-0 text-sm bg-gray-50">
                       <span className="font-medium text-[#1e3a29]">{p.medicineName}</span>
                       <span className="text-gray-500">{p.dosage} - {p.duration}</span>
                       <button onClick={() => removeDraftMedicine(p.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                     </div>
                   ))}
                 </div>
               )}

               <div className="mt-6 flex justify-end">
                  <button onClick={handleSaveVisit} className="bg-[#c5a059] text-[#1e3a29] px-6 py-2 rounded font-bold text-sm shadow hover:bg-[#b08d4b] flex items-center gap-2"><FileText size={16} /> Save Consultation</button>
               </div>
            </div>

            {/* Visit History */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
               <h3 className="font-bold text-[#1e3a29] flex items-center gap-2 mb-6"><Calendar className="text-[#c5a059]" /> History</h3>
               <div className="space-y-6">
                  {visitHistory.length === 0 ? <p className="text-gray-400 text-sm italic">No history found.</p> : visitHistory.map((visit) => (
                    <div key={visit.id} className="relative pl-6 border-l-2 border-[#c5a059]/30 pb-6 last:pb-0">
                       <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#c5a059] border-2 border-white shadow-sm"></div>
                       <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-xs font-bold text-[#c5a059] uppercase">{new Date(visit.date).toLocaleDateString()}</span>
                            <p className="font-bold text-sm mt-1">{visit.diagnosis || "No Diagnosis"}</p>
                          </div>
                          <div className="flex gap-2">
                             <button onClick={() => handleEditHistory(visit)} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Edit2 size={14}/></button>
                             <button onClick={() => handleDeleteHistory(visit.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14}/></button>
                          </div>
                       </div>
                       {visit.prescriptions?.map((p:any, i:number) => (
                         <div key={i} className="flex justify-between text-xs text-gray-600 py-0.5 border-b last:border-0 border-gray-100">
                           <span>{p.medicineName}</span>
                           <span>{p.dosage}</span>
                         </div>
                       ))}
                    </div>
                  ))}
               </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}