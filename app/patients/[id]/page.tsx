"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation"; // Added useSearchParams
import StaffHeader from "@/app/components/StaffHeader"; 
import { generateBill } from "@/app/components/BillGenerator";
import { 
  User, Phone, Calendar, Edit2, Search, 
  Plus, FileText, Trash2, Stethoscope, Loader2, X,
  FileUp, Eye, Printer, Scale, Leaf, Droplets 
} from "lucide-react";

import { 
  getPatientData, 
  getPharmacyInventory, 
  updatePatient as updatePatientDetails,
  savePrescription, 
  searchPatients,
  deleteVisit,
  uploadConsultationReport 
} from "@/app/actions";

// --- STATIC DATA (Updated per Feedback) ---
const DOSAGE_OPTIONS = ["1-0-0", "0-1-0", "0-0-1", "1-0-1", "1-1-0", "0-1-1", "1-1-1", "2-0-0", "0-2-0", "0-0-2", "2-0-2", "2-2-0", "0-2-2", "2-2-2", "3-0-0", "0-3-0", "0-0-3", "3-0-3", "3-3-0", "0-3-3", "3-3-3", "SOS"];
const UNIT_OPTIONS = ["Tablet", "Capsule", "Spoon (tsp)", "Drop", "Sachet", "Pouch"]; // Removed ml, gm, pills
const INSTRUCTION_OPTIONS = ["After Food", "Before Food", "Empty Stomach", "Before Sleep"]; // Removed water/milk (Moved to 'With')
const WITH_OPTIONS = ["Regular Water", "Warm Water", "Milk", "Honey", "Ghee"]; // New Field
const DURATION_OPTIONS = Array.from({length: 30}, (_, i) => `${i + 1} Days`).concat(["1 Week", "2 Weeks", "3 Weeks", "1 Month", "2 Months"]);

export default function PatientProfile() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const patientId = params.id as string;
  // Capture Appointment ID from URL (Fixes Point #7 & #9 linkage)
  const linkedAppointmentId = searchParams.get('appointmentId'); 

  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  
  // Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [patientSuggestions, setPatientSuggestions] = useState<any[]>([]);
  const [showPatientSearch, setShowPatientSearch] = useState(false);

  // Medicine States
  const [inventory, setInventory] = useState<any[]>([]); 
  const [medQuery, setMedQuery] = useState(""); 
  const [showMedList, setShowMedList] = useState(false);
  const medListRef = useRef<HTMLDivElement>(null); 

  // Patient Data
  const [patient, setPatient] = useState<any>(null);
  const [visitHistory, setVisitHistory] = useState<any[]>([]);

  // Current Visit (Draft)
  const [visitNote, setVisitNote] = useState(""); 
  const [panchkarmaNote, setPanchkarmaNote] = useState(""); // Separated Note
  const [currentPrescriptions, setCurrentPrescriptions] = useState<any[]>([]);
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null); // Track if editing old record

  // New Medicine Input State
  const [newMed, setNewMed] = useState({
    medicineId: "", 
    medicineName: "",
    dosage: "1-0-1", 
    unit: "Tablet",
    duration: "7 Days", 
    instruction: "After Food",
    with: "Regular Water" // New Field
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
          const mappedHistory = (pData.consultations || []).map((c: any) => ({
            id: c.id,
            appointmentId: c.appointment?.readableId,
            date: c.createdAt,
            diagnosis: c.diagnosis,
            notes: c.notes, // Panchkarma/Notes
            doctorName: c.doctorName,
            reportUrl: c.reportUrl,
            prescriptions: c.prescriptions.flatMap((p: any) => 
              p.items.map((i: any) => ({
                id: i.id, 
                medicineName: i.medicine.name, 
                medicineId: i.medicineId,
                dosage: i.dosage,
                unit: i.unit,
                duration: i.duration,
                instruction: i.instruction,
                panchkarma: i.panchkarma
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
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // --- HANDLERS ---
  const selectPatient = (id: string) => {
    setSearchQuery("");
    setShowPatientSearch(false);
    router.push(`/patients/${id}`);
  };

  const handleSaveDetails = async () => {
    await updatePatientDetails(patientId, patient);
    setIsEditingDetails(false);
  };

  const selectMedicine = (med: any) => {
    setNewMed({ ...newMed, medicineId: med.id, medicineName: med.name, unit: med.type || "Tablet" });
    setMedQuery(med.name); 
    setShowMedList(false); 
  };

  const handleAddMedicine = () => {
    if (!newMed.medicineId && !newMed.medicineName) return alert("Please select or enter a medicine");
    
    // Combine Instruction + With
    const combinedInstruction = `${newMed.instruction} (with ${newMed.with})`;

    setCurrentPrescriptions([
      ...currentPrescriptions, 
      { 
        ...newMed, 
        instruction: combinedInstruction, // Store combined
        medicineName: newMed.medicineName || medQuery, 
        id: Date.now() 
      } 
    ]);
    
    // Reset form but keep common settings
    setNewMed({ ...newMed, medicineId: "", medicineName: "" }); 
    setMedQuery(""); 
  };

  const removeDraftMedicine = (id: number) => {
    setCurrentPrescriptions(currentPrescriptions.filter(p => p.id !== id));
  };

  const handleSaveVisit = async () => {
    if (currentPrescriptions.length === 0 && !visitNote) {
      return alert("Please add medicines or a note before saving.");
    }
    
    const visitData = { 
      diagnosis: visitNote, 
      notes: panchkarmaNote, // Saved here
      prescriptions: currentPrescriptions,
      doctorName: "Dr. Chirag Raval",
      appointmentId: linkedAppointmentId // Link to specific appointment if available
    };
    
    // Pass editingVisitId to update existing record instead of creating new
    const result = await savePrescription(patientId, visitData, editingVisitId || undefined);
    
    if (result.success) {
      alert(editingVisitId ? "Consultation Updated!" : "Consultation Saved!");
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

  // ✅ FIX: Editing now tracks ID to prevent duplicates
  const handleEditHistory = (visit: any) => {
    if (currentPrescriptions.length > 0) {
      if(!confirm("Discard current unsaved changes?")) return;
    }
    
    setEditingVisitId(visit.id); // Set Edit Mode
    setVisitNote(visit.diagnosis || "");
    setPanchkarmaNote(visit.notes || ""); // Load Notes

    // Load Items
    const draftItems = visit.prescriptions.map((p: any) => ({
       id: Math.random(),
       medicineId: p.medicineId,
       medicineName: p.medicineName,
       dosage: p.dosage,
       unit: p.unit || "Tablet",
       duration: p.duration,
       instruction: p.instruction,
       // Panchkarma is not needed on item level per user request, but keeping just in case
       // Use main note for Panchkarma now
    }));
    setCurrentPrescriptions(draftItems);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
     setEditingVisitId(null);
     setVisitNote("");
     setPanchkarmaNote("");
     setCurrentPrescriptions([]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, consultationId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) return alert("File size too large (Max 4MB)");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("consultationId", consultationId);

    setUploadingId(consultationId);
    try {
        const res = await uploadConsultationReport(formData);
        if (res.success) {
            setVisitHistory(prev => prev.map(v => v.id === consultationId ? {...v, reportUrl: res.url} : v));
        } else {
            alert("Upload failed");
        }
    } catch (error) {
        console.error(error);
        alert("Error uploading file");
    } finally {
        setUploadingId(null);
    }
  };

  const handlePrintReceipt = (visit: any) => {
    generateBill({
        billNo: `RCPT-${visit.id.slice(-4).toUpperCase()}`,
        date: new Date(visit.date).toLocaleDateString(),
        patientName: patient.name,
        patientId: patient.readableId || patient.id.slice(0,6),
        appointmentId: visit.appointmentId || "WALK-IN", // Uses stored ID
        doctorName: visit.doctorName || "Dr. Chirag Raval",
        items: [{
            name: "Consultation Charge",
            qty: 1,
            amount: 500
        }]
    });
  };

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
            <div className="flex gap-2 items-center mt-1">
                <p className="text-xs text-[#c5a059] font-bold uppercase tracking-widest bg-[#1e3a29]/5 px-2 py-1 rounded w-fit">
                   ID: {patient.readableId || patientId.slice(0,6)}
                </p>
                {linkedAppointmentId && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">Linked Appt: {linkedAppointmentId.slice(-4)}</span>}
            </div>
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
                 onBlur={() => setTimeout(() => setShowPatientSearch(false), 200)} 
               />
               {searchQuery && (
                 <button onClick={() => { setSearchQuery(""); setShowPatientSearch(false); }} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                    <X size={16} />
                 </button>
               )}
             </div>

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
                         <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-500">
                            {p.readableId || "N/A"}
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
                {/* NAME */}
                <div>
                   <label className="text-xs font-bold text-gray-400 uppercase">Name</label>
                   {isEditingDetails ? <input className="w-full border-b font-medium" value={patient.name} onChange={e => setPatient({...patient, name: e.target.value})} /> : <p className="font-bold text-xl">{patient.name}</p>}
                </div>
                
                {/* AGE / GENDER */}
                <div className="flex gap-4">
                   <div className="flex-1"><label className="text-xs text-gray-400 uppercase">Age</label>
                   {isEditingDetails ? <input type="number" className="w-full border-b" value={patient.age || ""} onChange={e => setPatient({...patient, age: e.target.value})} /> : <p>{patient.age} Y</p>}</div>
                   <div className="flex-1"><label className="text-xs text-gray-400 uppercase">Gender</label>
                   {isEditingDetails ? <select className="w-full border-b" value={patient.gender || ""} onChange={e => setPatient({...patient, gender: e.target.value})}><option>Male</option><option>Female</option></select> : <p>{patient.gender}</p>}</div>
                </div>

                {/* PHONE */}
                <div>
                   <label className="text-xs font-bold text-gray-400 uppercase">Phone</label>
                   {isEditingDetails ? <input className="w-full border-b" value={patient.phone} onChange={e => setPatient({...patient, phone: e.target.value})} /> : <div className="flex items-center gap-2"><Phone size={14} className="text-[#c5a059]" /> {patient.phone}</div>}
                </div>

                {/* WEIGHT & PRAKRITI */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-dashed">
                   <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"><Scale size={10}/> Weight (Cur/Init)</label>
                      {isEditingDetails ? (
                        <div className="flex gap-1">
                           <input placeholder="Cur" className="w-10 border-b text-sm" value={patient.currentWeight || ""} onChange={e => setPatient({...patient, currentWeight: e.target.value})} />
                           <span className="text-gray-400">/</span>
                           <input placeholder="Init" className="w-10 border-b text-sm" value={patient.initialWeight || ""} onChange={e => setPatient({...patient, initialWeight: e.target.value})} />
                        </div>
                      ) : (
                        <p className="text-sm font-bold text-gray-700">{patient.currentWeight || "-"} / <span className="text-gray-400 font-normal">{patient.initialWeight || "-"}</span></p>
                      )}
                   </div>
                   <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"><Leaf size={10}/> Prakriti</label>
                      {isEditingDetails ? <input className="w-full border-b text-sm" value={patient.prakriti || ""} onChange={e => setPatient({...patient, prakriti: e.target.value})} /> : <p className="text-sm font-bold text-purple-700">{patient.prakriti || "-"}</p>}
                   </div>
                </div>

                <div className="pt-2">
                   <label className="text-xs font-bold text-red-400 uppercase">History / Allergies</label>
                   {isEditingDetails ? <textarea className="w-full bg-red-50 border-red-100 p-2 text-sm" rows={2} value={patient.history || ""} onChange={e => setPatient({...patient, history: e.target.value})} /> : <p className="text-sm font-medium text-red-600">{patient.history || "None"}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* --- RIGHT: PRESCRIBE --- */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* New Consultation */}
            <div className={`bg-white rounded-xl shadow-sm border p-6 relative ${editingVisitId ? 'border-amber-400 ring-1 ring-amber-400' : 'border-gray-100'}`}>
               <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-[#1e3a29] flex items-center gap-2">
                     <Stethoscope className="text-[#c5a059]" /> 
                     {editingVisitId ? "Editing Past Consultation" : "New Consultation"}
                  </h3>
                  {editingVisitId && (
                     <button onClick={handleCancelEdit} className="text-xs bg-gray-100 px-3 py-1 rounded hover:bg-gray-200 text-gray-600">Cancel Edit</button>
                  )}
               </div>
               
               {/* 1. DIAGNOSIS */}
               <div className="mb-4">
                  <label className="text-[10px] font-bold uppercase text-gray-400">Diagnosis / Symptoms</label>
                  <textarea className="w-full p-3 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#c5a059] outline-none" rows={2} placeholder="Enter diagnosis..." value={visitNote} onChange={(e) => setVisitNote(e.target.value)} />
               </div>

               {/* 2. PANCHKARMA / NOTE (Moved Down per feedback) */}
               <div className="mb-4">
                  <label className="text-[10px] font-bold uppercase text-gray-400">Panchkarma / Special Note</label>
                  <textarea className="w-full p-2 border rounded-lg text-sm bg-purple-50 focus:bg-white focus:ring-2 focus:ring-purple-400 outline-none" rows={1} placeholder="Enter Panchkarma details or special notes..." value={panchkarmaNote} onChange={(e) => setPanchkarmaNote(e.target.value)} />
               </div>
               
               {/* 3. MEDICINE INPUT GRID */}
               <div className="bg-[#f8faf9] p-4 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-12 gap-3 items-end mb-3">
                     {/* Medicine Search */}
                     <div className="col-span-12 md:col-span-4 relative" ref={medListRef}>
                        <label className="text-[10px] font-bold uppercase text-gray-500">Medicine</label>
                        <input 
                          type="text" 
                          placeholder="Search medicine..." 
                          className="w-full p-2 border rounded-md text-sm focus:border-[#c5a059] outline-none bg-white"
                          value={medQuery}
                          onChange={(e) => { setMedQuery(e.target.value); setShowMedList(true); }}
                          onFocus={() => setShowMedList(true)}
                        />
                        {showMedList && (
                          <div className="absolute top-full mt-1 left-0 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto z-40">
                            {filteredInventory.length === 0 ? (
                              <div className="p-2 text-xs text-gray-400 italic">Type to add custom medicine...</div>
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

                     {/* Dosage Dropdown */}
                     <div className="col-span-6 md:col-span-2">
                        <label className="text-[10px] font-bold uppercase text-gray-500">Dosage</label>
                        <select className="w-full p-2 border rounded text-sm bg-white" value={newMed.dosage} onChange={e => setNewMed({...newMed, dosage: e.target.value})}>
                           {DOSAGE_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                        </select>
                     </div>

                     {/* Unit Dropdown */}
                     <div className="col-span-6 md:col-span-2">
                        <label className="text-[10px] font-bold uppercase text-gray-500">Unit</label>
                        <select className="w-full p-2 border rounded text-sm bg-white" value={newMed.unit} onChange={e => setNewMed({...newMed, unit: e.target.value})}>
                           {UNIT_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                        </select>
                     </div>

                     {/* Duration Dropdown */}
                     <div className="col-span-6 md:col-span-2">
                        <label className="text-[10px] font-bold uppercase text-gray-500">Duration</label>
                        <select className="w-full p-2 border rounded text-sm bg-white" value={newMed.duration} onChange={e => setNewMed({...newMed, duration: e.target.value})}>
                           {DURATION_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                        </select>
                     </div>

                     {/* Add Button */}
                     <div className="col-span-6 md:col-span-2">
                        <button onClick={handleAddMedicine} className="w-full h-[38px] bg-[#1e3a29] text-white rounded flex items-center justify-center hover:bg-[#162b1e] text-sm font-bold shadow-md"><Plus size={16} /> ADD</button>
                     </div>
                  </div>

                  {/* 2nd Row: Instruction & WITH Field */}
                  <div className="grid grid-cols-12 gap-3 items-end">
                     {/* WITH Dropdown (New) */}
                     <div className="col-span-6 md:col-span-4">
                        <label className="text-[10px] font-bold uppercase text-gray-500 flex items-center gap-1"><Droplets size={10}/> With</label>
                        <select className="w-full p-2 border rounded text-sm bg-white" value={newMed.with} onChange={e => setNewMed({...newMed, with: e.target.value})}>
                           {WITH_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                        </select>
                     </div>

                     {/* Instruction Dropdown */}
                     <div className="col-span-6 md:col-span-8">
                        <label className="text-[10px] font-bold uppercase text-gray-500">Instruction</label>
                        <select className="w-full p-2 border rounded text-sm bg-white" value={newMed.instruction} onChange={e => setNewMed({...newMed, instruction: e.target.value})}>
                           {INSTRUCTION_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                        </select>
                     </div>
                  </div>
               </div>

               {/* Draft Table */}
               {currentPrescriptions.length > 0 && (
                 <div className="mt-4 border rounded-lg overflow-hidden">
                   <table className="w-full text-sm text-left">
                      <thead className="bg-gray-100 text-xs text-gray-500 uppercase">
                         <tr>
                            <th className="p-2 pl-3">Medicine</th>
                            <th className="p-2">Dosage</th>
                            <th className="p-2">Details</th>
                            <th className="p-2 text-right">Action</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                         {currentPrescriptions.map((p) => (
                           <tr key={p.id}>
                              <td className="p-2 pl-3">
                                 <div className="font-bold text-[#1e3a29]">{p.medicineName}</div>
                                 <div className="text-xs text-gray-500">{p.unit} • {p.duration}</div>
                              </td>
                              <td className="p-2 font-mono text-xs">{p.dosage}</td>
                              <td className="p-2 text-xs text-gray-600">{p.instruction}</td>
                              <td className="p-2 text-right">
                                 <button onClick={() => removeDraftMedicine(p.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                 </div>
               )}

               <div className="mt-6 flex justify-end">
                  <button onClick={handleSaveVisit} className={`px-6 py-2 rounded font-bold text-sm shadow flex items-center gap-2 ${editingVisitId ? 'bg-amber-400 text-black hover:bg-amber-500' : 'bg-[#c5a059] text-[#1e3a29] hover:bg-[#b08d4b]'}`}>
                     <FileText size={16} /> {editingVisitId ? "Update Consultation" : "Save Consultation"}
                  </button>
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
                            {/* Diagnosis & Note */}
                            <p className="font-bold text-sm mt-1">{visit.diagnosis || "No Diagnosis"}</p>
                            {visit.notes && <p className="text-xs text-purple-700 bg-purple-50 px-2 py-1 mt-1 rounded inline-block">Note: {visit.notes}</p>}
                            
                            <div className="mt-2 flex items-center gap-3">
                                {visit.reportUrl ? (
                                    <a href={visit.reportUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded flex items-center gap-1 font-bold hover:bg-green-100 transition">
                                        <Eye size={12} /> View Report
                                    </a>
                                ) : (
                                    <label className={`text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded flex items-center gap-1 font-bold cursor-pointer hover:bg-gray-200 transition ${uploadingId === visit.id ? 'opacity-50 pointer-events-none' : ''}`}>
                                        {uploadingId === visit.id ? <><Loader2 size={12} className="animate-spin"/> Uploading...</> : <><FileUp size={12} /> Upload Report</>}
                                        <input type="file" className="hidden" accept="application/pdf,image/*" onChange={(e) => handleFileUpload(e, visit.id)} />
                                    </label>
                                )}
                                <button onClick={() => handlePrintReceipt(visit)} className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded flex items-center gap-1 font-bold hover:bg-yellow-100 transition">
                                    <Printer size={12} /> Receipt
                                </button>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                             <button onClick={() => handleEditHistory(visit)} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Edit2 size={14}/></button>
                             <button onClick={() => handleDeleteHistory(visit.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14}/></button>
                          </div>
                       </div>
                       
                       {visit.prescriptions?.map((p:any, i:number) => (
                         <div key={i} className="flex justify-between text-xs text-gray-600 py-1 border-b last:border-0 border-gray-100">
                           <div className="flex flex-col">
                              <span className="font-medium">{p.medicineName}</span>
                           </div>
                           <div className="text-right">
                              <span className="block">{p.dosage}</span>
                              <span className="text-[10px] text-gray-400">{p.instruction}</span>
                           </div>
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