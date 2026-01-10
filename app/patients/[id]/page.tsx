"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation"; 
import StaffHeader from "@/app/components/StaffHeader"; 
import { generateBill } from "@/app/components/BillGenerator";
import { 
  User, Phone, Calendar, Edit2, Search, 
  Plus, FileText, Trash2, Stethoscope, Loader2, X,
  FileUp, Eye, Printer, Scale, Leaf, Droplets, BadgePercent, Activity,
  ChevronDown, ChevronUp, Save // ✅ Added Save Icon
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

// --- STATIC DATA ---
const DOSAGE_OPTIONS = [
  "1-0-0", "0-1-0", "0-0-1", "1-0-1", "1-1-0", "0-1-1", "1-1-1", 
  "2-0-0", "0-2-0", "0-0-2", "2-0-2", "2-2-0", "0-2-2", "2-2-2", 
  "3-0-0", "0-3-0", "0-0-3", "3-0-3", "3-3-0", "0-3-3", "3-3-3",
  "4-0-0", "0-4-0", "0-0-4", "4-0-4", "4-4-0", "0-4-4", "4-4-4", 
  "SOS"
];
const UNIT_OPTIONS = ["Tablet", "Capsule", "Spoon (tsp)", "Drop", "Sachet", "Pouch"]; 
const INSTRUCTION_OPTIONS = ["After Food", "Before Food", "Empty Stomach", "Before Sleep"]; 
const WITH_OPTIONS = ["Regular Water", "Warm Water", "Milk", "Honey", "Ghee", "External Application"]; 

// ✅ REQ 2: Dynamic Duration Arrays
const REGULAR_DURATIONS = ["7 Days","10 Days","15 Days", "21 Days", "30 Days", "45 Days", "60 Days", "90 Days","120 Days"];
const PANCHKARMA_DURATIONS = Array.from({length: 30}, (_, i) => `${i + 1} Days`);

// ✅ REQ 3: Physical Generals Template
const PHYSICAL_GENERALS_TEMPLATE = `Appetite : 
Thirst : 
Craving/Desire For Food Or Drinks (If Any) : 
Aversion Of Food Or Drinks (If Any) : 
Taste You Prefer Most : Sweet [ ], Spicy [ ], Sour [ ], Salty [ ]
Thermal : 
Perspiration : 
Bowels : 
Urine : 
Sleep : 
Dreams : 
Fears : `;

export default function PatientProfile() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const patientId = params.id as string;
  const linkedAppointmentId = searchParams.get('appointmentId'); 

  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [savingDetails, setSavingDetails] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [showExtendedDetails, setShowExtendedDetails] = useState(false); 

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
  const [consultationType, setConsultationType] = useState<'REGULAR' | 'PANCHKARMA'>('REGULAR');
  const [visitNote, setVisitNote] = useState(""); 
  const [panchkarmaNote, setPanchkarmaNote] = useState(""); 
  const [isChargeable, setIsChargeable] = useState("YES"); 

  const [currentPrescriptions, setCurrentPrescriptions] = useState<any[]>([]);
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null); 
  
  // ✅ NEW: Track which medicine row is being edited
  const [editingMedId, setEditingMedId] = useState<number | null>(null);

  // New Medicine Input State
  const [newMed, setNewMed] = useState({
    medicineId: "", 
    medicineName: "",
    dosage: "1-0-1", 
    unit: "Tablet",
    duration: "7 Days", 
    instruction: "",
    with: "Regular Water" 
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
          const rawData = pData as any;
          
          setPatient({
              ...pData,
              physicalGenerals: rawData.physicalGenerals ? rawData.physicalGenerals : PHYSICAL_GENERALS_TEMPLATE
          });
          
          const mappedHistory = (pData.consultations || []).map((c: any) => ({
            id: c.id,
            appointmentId: c.appointment?.readableId,
            date: c.createdAt,
            diagnosis: c.diagnosis,
            notes: c.notes, 
            doctorName: c.doctorName,
            reportUrl: c.reportUrl,
            discount: c.discount || 0, 
            prescriptions: c.prescriptions.flatMap((p: any) => 
              p.items.map((i: any) => ({
                id: i.id, 
                medicineName: i.medicine.name, 
                medicineId: i.medicineId,
                dosage: i.dosage,
                unit: i.unit,
                duration: i.duration,
                instruction: i.instruction,
                panchkarma: i.panchkarma,
                price: i.medicine.price 
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
    setSavingDetails(true);
    const cleanData = {
        ...patient,
        initialWeight: patient.initialWeight || null,
        currentWeight: patient.currentWeight || null,
        physicalGenerals: patient.physicalGenerals
    };

    const res = await updatePatientDetails(patientId, cleanData);
    setSavingDetails(false);
    
    if (res.success) {
        setIsEditingDetails(false);
    } else {
        alert("Failed to update details.");
    }
  };

  const selectMedicine = (med: any) => {
    setNewMed({ ...newMed, medicineId: med.id, medicineName: med.name, unit: med.type || "Tablet" });
    setMedQuery(med.name); 
    setShowMedList(false); 
  };

  const handleAddMedicine = () => {
    if (!newMed.medicineId && !newMed.medicineName) return alert("Please select or enter a medicine");
    
    const combinedInstruction = consultationType === 'REGULAR' 
        ? `${newMed.instruction} (with ${newMed.with})`
        : newMed.instruction;

    if (editingMedId !== null) {
        // ✅ UPDATE EXISTING ITEM
        setCurrentPrescriptions(prev => prev.map(item => 
            item.id === editingMedId ? {
                ...item,
                ...newMed,
                instruction: combinedInstruction,
                medicineName: newMed.medicineName || medQuery,
                dosage: consultationType === 'REGULAR' ? newMed.dosage : "-",
                unit: consultationType === 'REGULAR' ? newMed.unit : "-",
            } : item
        ));
        setEditingMedId(null); // Clear edit mode
    } else {
        // ✅ ADD NEW ITEM
        setCurrentPrescriptions([
          ...currentPrescriptions, 
          { 
            ...newMed, 
            instruction: combinedInstruction, 
            medicineName: newMed.medicineName || medQuery, 
            dosage: consultationType === 'REGULAR' ? newMed.dosage : "-",
            unit: consultationType === 'REGULAR' ? newMed.unit : "-",
            id: Date.now() 
          } 
        ]);
    }
    
    // Reset form
    setNewMed({ ...newMed, medicineId: "", medicineName: "", instruction: "" }); 
    setMedQuery(""); 
  };

  // ✅ EDIT HANDLER: Populates form with existing item data
  const handleEditDraftMedicine = (item: any) => {
      setEditingMedId(item.id);
      setMedQuery(item.medicineName);
      
      // Extract instruction and "with" part if present
      let instr = item.instruction;
      let withVal = "Regular Water"; // Default
      
      if (instr && instr.includes("(with")) {
          const parts = instr.split("(with");
          instr = parts[0].trim();
          withVal = parts[1].replace(")", "").trim();
      }

      setNewMed({
          medicineId: item.medicineId,
          medicineName: item.medicineName,
          dosage: item.dosage,
          unit: item.unit,
          duration: item.duration,
          instruction: instr,
          with: withVal
      });
  };

  const removeDraftMedicine = (id: number) => {
    setCurrentPrescriptions(currentPrescriptions.filter(p => p.id !== id));
    if (editingMedId === id) {
        setEditingMedId(null);
        setNewMed({ ...newMed, medicineId: "", medicineName: "", instruction: "" });
        setMedQuery("");
    }
  };

  const handleSaveVisit = async () => {
    if (currentPrescriptions.length === 0 && !visitNote && !panchkarmaNote) {
      return alert("Please add medicines or a note before saving.");
    }
    
    const calculatedDiscount = isChargeable === "YES" ? 0 : 500;

    const visitData = { 
      diagnosis: consultationType === 'REGULAR' ? visitNote : "Panchkarma Procedure", 
      notes: panchkarmaNote, 
      prescriptions: currentPrescriptions,
      doctorName: "Dr. Chirag Raval",
      appointmentId: linkedAppointmentId,
      discount: calculatedDiscount 
    };
    
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

  const handleEditHistory = (visit: any) => {
    if (currentPrescriptions.length > 0) {
      if(!confirm("Discard current unsaved changes?")) return;
    }
    
    setEditingVisitId(visit.id); 
    setVisitNote(visit.diagnosis || "");
    setPanchkarmaNote(visit.notes || "");
    setIsChargeable(visit.discount >= 500 ? "NO" : "YES");

    const draftItems = visit.prescriptions.map((p: any) => ({
       id: Math.random(),
       medicineId: p.medicineId,
       medicineName: p.medicineName,
       dosage: p.dosage,
       unit: p.unit || "Tablet",
       duration: p.duration,
       instruction: p.instruction,
    }));
    setCurrentPrescriptions(draftItems);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
     setEditingVisitId(null);
     setVisitNote("");
     setPanchkarmaNote("");
     setIsChargeable("YES");
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
    const items = visit.prescriptions.map((p: any) => ({
        name: `${p.medicineName} ${p.unit !== '-' ? `(${p.unit})` : ''}`,
        qty: 1, 
        amount: p.price || 0 
    }));

    if (visit.discount > 0) {
        items.push({
            name: "DISCOUNT APPLIED",
            qty: 1,
            amount: -visit.discount
        });
    }

    generateBill({
        billNo: `RCPT-${visit.id.slice(-4).toUpperCase()}`,
        date: new Date(visit.date).toLocaleDateString(),
        patientName: patient.name,
        patientId: patient.readableId || patient.id.slice(0,6),
        appointmentId: visit.appointmentId || "WALK-IN", 
        doctorName: visit.doctorName || "Dr. Chirag Raval",
        items: items.length > 0 ? items : [{ name: "Consultation Charge", qty: 1, amount: 500 - visit.discount }]
    });
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /> Loading...</div>;
  if (!patient) return <div className="p-10 text-center">Patient not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <StaffHeader />

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        
        {/* --- TOP BAR (SEARCH) --- */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
           <div>
            <h2 className="text-2xl font-serif font-bold text-[#1e3a29]">Patient Profile</h2>
            <div className="flex gap-2 items-center mt-1">
                <p className="text-xs text-[#c5a059] font-bold uppercase tracking-widest bg-[#1e3a29]/5 px-2 py-1 rounded w-fit">
                   ID: {patient.readableId}
                </p>
                {linkedAppointmentId && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">Linked: {linkedAppointmentId.slice(-4)}</span>}
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
                  <button 
                    onClick={() => isEditingDetails ? handleSaveDetails() : setIsEditingDetails(true)} 
                    disabled={savingDetails}
                    className="bg-[#c5a059] text-[#1e3a29] px-3 py-1 rounded text-xs font-bold disabled:opacity-50"
                  >
                    {savingDetails ? "Saving..." : (isEditingDetails ? "Save" : "Edit")}
                  </button>
              </div>
              <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                
                {/* Basic Info */}
                <div>
                   <label className="text-xs font-bold text-gray-400 uppercase">Name</label>
                   {isEditingDetails ? <input className="w-full border-b font-medium" value={patient.name} onChange={e => setPatient({...patient, name: e.target.value})} /> : <p className="font-bold text-xl">{patient.name}</p>}
                </div>
                <div className="flex gap-4">
                   <div className="flex-1"><label className="text-xs text-gray-400 uppercase">Age</label>{isEditingDetails ? <input type="number" className="w-full border-b" value={patient.age} onChange={e => setPatient({...patient, age: e.target.value})} /> : <p>{patient.age} Y</p>}</div>
                   <div className="flex-1"><label className="text-xs text-gray-400 uppercase">Gender</label>{isEditingDetails ? <select className="w-full border-b" value={patient.gender} onChange={e => setPatient({...patient, gender: e.target.value})}><option>Male</option><option>Female</option></select> : <p>{patient.gender}</p>}</div>
                </div>
                
                <div>
                   <label className="text-xs font-bold text-gray-400 uppercase">Blood Group</label>
                   {isEditingDetails ? (
                      <select className="w-full border-b bg-white" value={patient.bloodGroup || ""} onChange={e => setPatient({...patient, bloodGroup: e.target.value})}>
                         <option value="">Select...</option>
                         <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                         <option>O+</option><option>O-</option><option>AB+</option><option>AB-</option>
                      </select>
                   ) : (
                      <p className="font-bold">{patient.bloodGroup || "-"}</p>
                   )}
                </div>

                <div><label className="text-xs font-bold text-gray-400 uppercase">Phone</label>{isEditingDetails ? <input className="w-full border-b" value={patient.phone} onChange={e => setPatient({...patient, phone: e.target.value})} /> : <p>{patient.phone}</p>}</div>

                <div>
                   <label className="text-xs font-bold text-gray-400 uppercase">History / Allergies</label>
                   {isEditingDetails ? <textarea className="w-full border p-1 text-sm rounded" rows={2} value={patient.history || ""} onChange={e => setPatient({...patient, history: e.target.value})} /> : <p className="text-sm italic text-gray-600">{patient.history || "-"}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-dashed">
                   <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"><Scale size={10}/> Weight</label>
                      {isEditingDetails ? <div className="flex gap-1"><input placeholder="Cur" className="w-10 border-b text-sm" value={patient.currentWeight || ""} onChange={e => setPatient({...patient, currentWeight: e.target.value})} /><span className="text-gray-400">/</span><input placeholder="Init" className="w-10 border-b text-sm" value={patient.initialWeight || ""} onChange={e => setPatient({...patient, initialWeight: e.target.value})} /></div> : <p className="text-sm font-bold text-gray-700">{patient.currentWeight || "-"} / {patient.initialWeight || "-"}</p>}
                   </div>
                   <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"><Leaf size={10}/> Prakriti</label>
                      {isEditingDetails ? <input className="w-full border-b text-sm" value={patient.prakriti || ""} onChange={e => setPatient({...patient, prakriti: e.target.value})} /> : <p className="text-sm font-bold text-purple-700">{patient.prakriti || "-"}</p>}
                   </div>
                </div>

                <button onClick={() => setShowExtendedDetails(!showExtendedDetails)} className="text-xs font-bold text-[#c5a059] flex items-center gap-1 w-full justify-center border-t border-b py-2">
                   {showExtendedDetails ? <><ChevronUp size={14}/> Show Less</> : <><ChevronDown size={14}/> Show Medical History</>}
                </button>

                {showExtendedDetails && (
                   <div className="space-y-4 pt-2 animate-in slide-in-from-top-2">
                      <div><label className="text-xs font-bold text-gray-400 uppercase">Chief Complaints</label>{isEditingDetails ? <textarea className="w-full border p-1 text-sm rounded" rows={2} value={(patient as any).chiefComplaints || ""} onChange={e => setPatient({...patient, chiefComplaints: e.target.value})} /> : <p className="text-sm whitespace-pre-wrap">{(patient as any).chiefComplaints || "-"}</p>}</div>
                      <div><label className="text-xs font-bold text-gray-400 uppercase">K/C/O</label>{isEditingDetails ? <input className="w-full border-b text-sm" value={(patient as any).kco || ""} onChange={e => setPatient({...patient, kco: e.target.value})} /> : <p className="text-sm">{(patient as any).kco || "-"}</p>}</div>
                      <div><label className="text-xs font-bold text-gray-400 uppercase">Current Meds</label>{isEditingDetails ? <textarea className="w-full border p-1 text-sm rounded" value={(patient as any).currentMedications || ""} onChange={e => setPatient({...patient, currentMedications: e.target.value})} /> : <p className="text-sm">{(patient as any).currentMedications || "-"}</p>}</div>
                      <div><label className="text-xs font-bold text-gray-400 uppercase">Investigations</label>{isEditingDetails ? <textarea className="w-full border p-1 text-sm rounded" value={(patient as any).investigations || ""} onChange={e => setPatient({...patient, investigations: e.target.value})} /> : <p className="text-sm">{(patient as any).investigations || "-"}</p>}</div>
                      
                      <div className="grid grid-cols-2 gap-3">
                         <div><label className="text-[10px] font-bold text-gray-400 uppercase">Past History</label>{isEditingDetails ? <textarea className="w-full border p-1 text-xs rounded" value={(patient as any).pastHistory || ""} onChange={e => setPatient({...patient, pastHistory: e.target.value})} /> : <p className="text-xs">{(patient as any).pastHistory || "-"}</p>}</div>
                         <div><label className="text-[10px] font-bold text-gray-400 uppercase">Family History</label>{isEditingDetails ? <textarea className="w-full border p-1 text-xs rounded" value={(patient as any).familyHistory || ""} onChange={e => setPatient({...patient, familyHistory: e.target.value})} /> : <p className="text-xs">{(patient as any).familyHistory || "-"}</p>}</div>
                      </div>

                      <div><label className="text-xs font-bold text-gray-400 uppercase">Mental Generals</label>{isEditingDetails ? <textarea className="w-full border p-1 text-sm rounded" value={(patient as any).mentalGenerals || ""} onChange={e => setPatient({...patient, mentalGenerals: e.target.value})} /> : <p className="text-sm">{(patient as any).mentalGenerals || "-"}</p>}</div>
                      <div><label className="text-xs font-bold text-gray-400 uppercase">OBS/GYN History</label>{isEditingDetails ? <textarea className="w-full border p-1 text-sm rounded" value={(patient as any).obsGynHistory || ""} onChange={e => setPatient({...patient, obsGynHistory: e.target.value})} /> : <p className="text-sm">{(patient as any).obsGynHistory || "-"}</p>}</div>

                      <div>
                         <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Physical Generals</label>
                         {isEditingDetails ? (
                            <textarea 
                                className="w-full border p-2 text-xs font-mono rounded bg-gray-50 h-64" 
                                value={(patient as any).physicalGenerals} 
                                onChange={e => setPatient({...patient, physicalGenerals: e.target.value})} 
                            />
                         ) : (
                            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans bg-gray-50 p-2 rounded">{(patient as any).physicalGenerals}</pre>
                         )}
                      </div>
                   </div>
                )}
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

               {/* Consultation Type Toggle */}
               <div className="flex gap-4 mb-6 p-1 bg-gray-50 rounded-lg w-fit">
                  <button 
                    onClick={() => setConsultationType('REGULAR')}
                    className={`px-4 py-2 text-xs font-bold rounded-md transition ${consultationType === 'REGULAR' ? 'bg-[#1e3a29] text-white shadow' : 'text-gray-500 hover:bg-gray-200'}`}
                  >
                    Regular Consultation
                  </button>
                  <button 
                    onClick={() => setConsultationType('PANCHKARMA')}
                    className={`px-4 py-2 text-xs font-bold rounded-md transition ${consultationType === 'PANCHKARMA' ? 'bg-[#c5a059] text-[#1e3a29] shadow' : 'text-gray-500 hover:bg-gray-200'}`}
                  >
                    Panchkarma / Procedure
                  </button>
               </div>
               
               {/* 1. DIAGNOSIS (Hidden if Panchkarma) */}
               {consultationType === 'REGULAR' && (
                 <div className="mb-4 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-bold uppercase text-gray-400">Diagnosis / Symptoms</label>
                    <textarea className="w-full p-3 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#c5a059] outline-none" rows={2} placeholder="Enter diagnosis..." value={visitNote} onChange={(e) => setVisitNote(e.target.value)} />
                 </div>
               )}

               {/* 2. PANCHKARMA / NOTE */}
               <div className="mb-4">
                  <label className={`text-[10px] font-bold uppercase ${consultationType === 'PANCHKARMA' ? 'text-[#c5a059]' : 'text-gray-400'}`}>
                    {consultationType === 'PANCHKARMA' ? 'Procedure Details / Notes' : 'Special Note (Optional)'}
                  </label>
                  <textarea 
                    className={`w-full p-2 border rounded-lg text-sm outline-none focus:bg-white focus:ring-2 ${consultationType === 'PANCHKARMA' ? 'bg-purple-50 focus:ring-purple-400 border-purple-100' : 'bg-gray-50 focus:ring-[#c5a059]'}`}
                    rows={consultationType === 'PANCHKARMA' ? 3 : 1} 
                    placeholder={consultationType === 'PANCHKARMA' ? "Enter Panchkarma procedure details..." : "Enter special notes..."}
                    value={panchkarmaNote} 
                    onChange={(e) => setPanchkarmaNote(e.target.value)} 
                  />
               </div>
               
               {/* 3. MEDICINE INPUT GRID */}
               <div className={`bg-[#f8faf9] p-4 rounded-lg border transition-all ${editingMedId !== null ? 'border-amber-300 ring-1 ring-amber-300' : 'border-gray-200'}`}>
                  {editingMedId !== null && <div className="text-xs font-bold text-amber-600 mb-2 flex items-center gap-1"><Edit2 size={12}/> Editing Medicine Item</div>}
                  
                  <div className="grid grid-cols-12 gap-3 items-end mb-3">
                      
                      {/* Medicine/Procedure Search */}
                      <div className={`col-span-12 ${consultationType === 'PANCHKARMA' ? 'md:col-span-8' : 'md:col-span-4'} relative`} ref={medListRef}>
                         <label className="text-[10px] font-bold uppercase text-gray-500">{consultationType === 'PANCHKARMA' ? 'Procedure' : 'Medicine'}</label>
                         <input 
                           type="text" 
                           placeholder={consultationType === 'PANCHKARMA' ? "Search procedure..." : "Search medicine..."} 
                           className="w-full p-2 border rounded-md text-sm focus:border-[#c5a059] outline-none bg-white"
                           value={medQuery}
                           onChange={(e) => { setMedQuery(e.target.value); setShowMedList(true); }}
                           onFocus={() => setShowMedList(true)}
                         />
                         {showMedList && (
                           <div className="absolute top-full mt-1 left-0 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto z-40">
                             {inventory.filter(i=>i.name.toLowerCase().includes(medQuery.toLowerCase())).map(item => (
                               <button 
                                 key={item.id} 
                                 onClick={() => selectMedicine(item)}
                                 className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 text-[#1e3a29] border-b last:border-0"
                               >
                                 {item.name}
                               </button>
                             ))}
                           </div>
                         )}
                      </div>

                      {/* Dosage/Unit (Hidden for Panchkarma) */}
                      {consultationType === 'REGULAR' && (
                        <>
                          <div className="col-span-6 md:col-span-2">
                             <label className="text-[10px] font-bold uppercase text-gray-500">Dosage</label>
                             <select className="w-full p-2 border rounded text-sm bg-white" value={newMed.dosage} onChange={e => setNewMed({...newMed, dosage: e.target.value})}>
                                {DOSAGE_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                             </select>
                          </div>
                          <div className="col-span-6 md:col-span-2">
                             <label className="text-[10px] font-bold uppercase text-gray-500">Unit</label>
                             <select className="w-full p-2 border rounded text-sm bg-white" value={newMed.unit} onChange={e => setNewMed({...newMed, unit: e.target.value})}>
                                {UNIT_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                             </select>
                          </div>
                        </>
                      )}

                      {/* Duration Dropdown */}
                      <div className="col-span-6 md:col-span-2">
                         <label className="text-[10px] font-bold uppercase text-gray-500">Duration</label>
                         <select className="w-full p-2 border rounded text-sm bg-white" value={newMed.duration} onChange={e => setNewMed({...newMed, duration: e.target.value})}>
                            {(consultationType === 'PANCHKARMA' ? PANCHKARMA_DURATIONS : REGULAR_DURATIONS).map(opt => <option key={opt}>{opt}</option>)}
                         </select>
                      </div>

                      <div className="col-span-6 md:col-span-2">
                         <button onClick={handleAddMedicine} className={`w-full h-[38px] text-white rounded flex items-center justify-center text-sm font-bold shadow-md ${editingMedId !== null ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[#1e3a29] hover:bg-[#162b1e]'}`}>
                            {editingMedId !== null ? <Save size={16} /> : <Plus size={16} />} 
                            <span className="ml-1">{editingMedId !== null ? "UPDATE" : "ADD"}</span>
                         </button>
                      </div>
                  </div>

                  {/* 2nd Row */}
                  <div className="grid grid-cols-12 gap-3 items-end">
                      {consultationType === 'REGULAR' && (
                        <div className="col-span-6 md:col-span-4">
                           <label className="text-[10px] font-bold uppercase text-gray-500 flex items-center gap-1"><Droplets size={10}/> With</label>
                           <select className="w-full p-2 border rounded text-sm bg-white" value={newMed.with} onChange={e => setNewMed({...newMed, with: e.target.value})}>
                              {WITH_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                           </select>
                        </div>
                      )}
                      <div className={`col-span-6 ${consultationType === 'PANCHKARMA' ? 'md:col-span-12' : 'md:col-span-8'}`}>
                         <label className="text-[10px] font-bold uppercase text-gray-500">Instruction</label>
                         <input 
                            list="instruction-options" 
                            className="w-full p-2 border rounded text-sm bg-white" 
                            value={newMed.instruction} 
                            onChange={e => setNewMed({...newMed, instruction: e.target.value})}
                            placeholder="Select or type..."
                         />
                         <datalist id="instruction-options">
                            {INSTRUCTION_OPTIONS.map(opt => <option key={opt} value={opt} />)}
                         </datalist>
                      </div>
                  </div>
               </div>

               {/* Draft Table */}
               {currentPrescriptions.length > 0 && (
                 <div className="mt-4 border rounded-lg overflow-hidden">
                   <table className="w-full text-sm text-left">
                      <thead className="bg-gray-100 text-xs text-gray-500 uppercase">
                         <tr>
                            <th className="p-2 pl-3">Medicine/Procedure</th>
                            <th className="p-2">Dosage</th>
                            <th className="p-2">Details</th>
                            <th className="p-2 text-right">Action</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                         {currentPrescriptions.map((p) => (
                           <tr key={p.id} className={editingMedId === p.id ? "bg-amber-50" : ""}>
                              <td className="p-2 pl-3">
                                 <div className="font-bold text-[#1e3a29]">{p.medicineName}</div>
                                 <div className="text-xs text-gray-500">{p.unit} • {p.duration}</div>
                              </td>
                              <td className="p-2 font-mono text-xs">{p.dosage}</td>
                              <td className="p-2 text-xs text-gray-600">{p.instruction}</td>
                              <td className="p-2 text-right">
                                 <div className="flex justify-end gap-2">
                                    <button onClick={() => handleEditDraftMedicine(p)} className="text-blue-400 hover:text-blue-600" title="Edit Item"><Edit2 size={16}/></button>
                                    <button onClick={() => removeDraftMedicine(p.id)} className="text-red-400 hover:text-red-600" title="Delete Item"><Trash2 size={16}/></button>
                                 </div>
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                 </div>
               )}

               <div className="mt-6 flex justify-between items-center border-t pt-4">
                  {/* Consultation Charge Radio */}
                  <div className="flex items-center gap-4">
                      <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><BadgePercent size={14}/> Consultation Charge?</span>
                      <div className="flex gap-2 bg-gray-100 p-1 rounded">
                         <button 
                            onClick={() => setIsChargeable("YES")}
                            className={`px-3 py-1 rounded text-xs font-bold transition ${isChargeable === "YES" ? 'bg-green-600 text-white shadow' : 'text-gray-500 hover:bg-white'}`}
                         >
                            Yes (₹500)
                         </button>
                         <button 
                            onClick={() => setIsChargeable("NO")}
                            className={`px-3 py-1 rounded text-xs font-bold transition ${isChargeable === "NO" ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-white'}`}
                         >
                            No (Free)
                         </button>
                      </div>
                  </div>

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
                            <p className="font-bold text-sm mt-1">{visit.diagnosis || "No Diagnosis"}</p>
                            {visit.notes && <p className="text-xs text-purple-700 bg-purple-50 px-2 py-1 mt-1 rounded inline-block">Note: {visit.notes}</p>}
                            
                            {/* Show Charge Status in History */}
                            {visit.discount >= 500 ? (
                                <p className="text-[10px] text-blue-600 font-bold mt-1 flex items-center gap-1"><Activity size={10}/> Consultation: FREE</p>
                            ) : (
                                <p className="text-[10px] text-green-700 font-bold mt-1 flex items-center gap-1"><Activity size={10}/> Consultation: CHARGED</p>
                            )}

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