"use client";

import { useState, useEffect, use } from "react";
// We need to import all icons explicitly
import { 
  User, 
  Clock, 
  FileText, 
  Plus, 
  Trash2, 
  Save, 
  Printer, 
  History as HistoryIcon, // Renamed to avoid conflict with browser History API
  Loader2 
} from "lucide-react";
import { getPatientProfile, saveConsultation } from "@/app/actions";
import { useRouter } from "next/navigation";

type PrescriptionItem = {
  id: string;
  medicine: string;
  dosage: string;
  duration: string;
  instruction: string;
};

export default function PatientConsultation({ params }: { params: Promise<{ id: string }> }) {
  
  const { id } = use(params);
  const router = useRouter();

  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [currentPrescription, setCurrentPrescription] = useState<PrescriptionItem[]>([]);
  
  const [newMed, setNewMed] = useState({ name: "", dosage: "1-0-1", duration: "3 Days", note: "After Food" });

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getPatientProfile(id);
        setPatient(data);
      } catch (error) {
        console.error("Failed to load profile", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const addMedicine = () => {
    if (!newMed.name) return;
    const item: PrescriptionItem = {
      id: Date.now().toString(),
      medicine: newMed.name,
      dosage: newMed.dosage,
      duration: newMed.duration,
      instruction: newMed.note
    };
    setCurrentPrescription([...currentPrescription, item]);
    setNewMed({ name: "", dosage: "1-0-1", duration: "3 Days", note: "After Food" });
  };

  const removeMedicine = (itemId: string) => {
    setCurrentPrescription(currentPrescription.filter(m => m.id !== itemId));
  };

  const handleSave = async () => {
    if (!symptoms && !diagnosis) return alert("Please add symptoms or diagnosis");
    
    // Create a temporary loading state specifically for saving if needed, 
    // or reuse loading (though reusing 'loading' hides the whole page which isn't ideal UI)
    // For simplicity, we'll just alert "Saving..."
    
    const result = await saveConsultation(id, {
      symptoms,
      diagnosis,
      prescription: currentPrescription
    });

    if (result.success) {
      alert("Consultation Saved Successfully! ✅");
      setSymptoms("");
      setDiagnosis("");
      setCurrentPrescription([]);
      
      const updatedData = await getPatientProfile(id);
      setPatient(updatedData);
    } else {
      alert("Error saving data. Please try again.");
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#FDFBF7]">
      <Loader2 className="animate-spin text-[#c5a059]" size={40}/>
    </div>
  );
  
  if (!patient) return (
    <div className="h-screen flex items-center justify-center bg-[#FDFBF7] text-[#1e3a29]">
      <div className="text-center">
        <h2 className="text-2xl font-serif font-bold">Patient Not Found</h2>
        <p className="text-gray-500 mt-2">The requested patient record does not exist.</p>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-[#FDFBF7] flex flex-col font-sans text-neutral-800 overflow-hidden">
      
      {/* HEADER */}
      <header className="bg-white border-b px-8 py-4 flex justify-between items-center shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#1e3a29] rounded-full flex items-center justify-center text-white font-serif font-bold text-xl uppercase">
            {patient.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-[#1e3a29]">{patient.name}</h1>
            <div className="flex gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><User size={12}/> {patient.age ? `${patient.age} Yrs` : "Age N/A"}</span>
              <span>•</span>
              <span>{patient.phone}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-[#c5a059] text-[#c5a059] rounded-lg text-sm font-bold hover:bg-[#c5a059]/10 transition">
             <HistoryIcon size={16}/> View Reports
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#1e3a29] text-white rounded-lg text-sm font-bold hover:bg-[#162b1e] transition">
              <Printer size={16}/> Print Summary
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT: HISTORY TIMELINE */}
        <div className="w-1/3 border-r bg-white overflow-y-auto p-6">
          <h2 className="text-sm font-bold uppercase text-gray-400 mb-6 tracking-wider flex items-center gap-2">
            <Clock size={16}/> Visit History
          </h2>
          
          <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-0 before:w-[2px] before:bg-gray-100">
            
            {/* 1. PAST CONSULTATIONS (Detailed History) */}
            {patient.consultations && patient.consultations.map((consult: any) => (
              <div key={consult.id} className="relative pl-10">
                {/* Green Dot for Completed */}
                <div className="absolute left-3 top-1 w-4 h-4 bg-[#1e3a29] rounded-full border-4 border-white shadow-sm z-10"></div>
                
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-[#1e3a29] bg-[#c5a059]/20 px-2 py-0.5 rounded">
                      {new Date(consult.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase font-bold">CONSULTATION</span>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-sm font-bold text-[#1e3a29]">{consult.diagnosis}</p>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-1">{consult.symptoms}</p>
                  </div>

                  {/* Robust Prescription Snippet */}
                  {consult.prescriptions && consult.prescriptions.length > 0 && (
                    <div className="border-t border-gray-100 pt-2 mt-2">
                       <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">MEDICINES:</p>
                       
                       {consult.prescriptions.map((rx: any) => (
                         <ul key={rx.id} className="text-xs text-gray-600 space-y-1">
                           {rx.items && rx.items.map((item: any, idx: number) => (
                              <li key={idx} className="flex justify-between items-center">
                                {/* Safety Check: Ensure medicine object exists */}
                                <span className="font-medium">
                                  {item.medicine ? item.medicine.name : "Unknown Medicine"}
                                </span>
                                <span className="text-gray-400 text-[10px] bg-gray-50 px-1 rounded">
                                  {item.dosage}
                                </span>
                              </li>
                           ))}
                         </ul>
                       ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* 2. UPCOMING APPOINTMENTS (Only Scheduled) */}
            {patient.appointments && patient.appointments
              .filter((a: any) => a.status === 'SCHEDULED')
              .map((apt: any) => (
              <div key={apt.id} className="relative pl-10">
                {/* Yellow Dot for Scheduled */}
                <div className="absolute left-3 top-1 w-4 h-4 bg-[#c5a059] rounded-full border-4 border-white shadow-sm z-10"></div>
                
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-[#1e3a29] bg-gray-200 px-2 py-0.5 rounded">{apt.date}</span>
                    <span className="text-[10px] text-gray-400 uppercase">{apt.type}</span>
                  </div>
                  <p className="text-sm font-bold text-[#c5a059]">Scheduled Visit</p>
                  <p className="text-xs text-gray-500">{apt.startTime} - {apt.doctor}</p>
                </div>
              </div>
            ))}

            {/* Empty State */}
            {(!patient.consultations?.length && !patient.appointments?.length) && (
               <div className="pl-10 text-gray-400 text-sm italic">No history found.</div>
            )}

          </div>
        </div>

        {/* RIGHT: CONSULTATION FORM */}
        <div className="w-2/3 bg-[#FDFBF7] overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto">
            
            <div className="mb-8">
               <h1 className="text-3xl font-serif font-bold text-[#1e3a29]">Ready to Consult</h1>
               <p className="text-gray-500 mt-1">
                 You are viewing the file for <span className="font-bold text-[#c5a059]">{patient.name}</span>.
               </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-[#c5a059]/20 p-6 mb-6">
              <h2 className="text-xl font-serif font-bold text-[#1e3a29] mb-6 flex items-center gap-2">
                <FileText className="text-[#c5a059]" /> Current Consultation
              </h2>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Symptoms / Complaints</label>
                  <textarea 
                    className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#c5a059] outline-none h-24 resize-none"
                    placeholder="e.g. Stomach pain, nausea..."
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                  ></textarea>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Diagnosis / Nadi Pariksha</label>
                  <textarea 
                    className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#c5a059] outline-none h-24 resize-none"
                    placeholder="e.g. Vata-Pitta imbalance..."
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <label className="block text-xs font-bold uppercase text-gray-500 mb-3">Prescribe Medicine</label>
                
                <div className="flex gap-2 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100 items-end">
                  <div className="flex-[3]">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Medicine Name</span>
                    <input 
                      type="text" 
                      className="w-full p-2 border rounded text-sm outline-none focus:border-[#c5a059]"
                      placeholder="Search medicine..."
                      value={newMed.name}
                      onChange={(e) => setNewMed({...newMed, name: e.target.value})}
                      onKeyDown={(e) => e.key === 'Enter' && addMedicine()}
                    />
                  </div>
                  <div className="flex-1">
                     <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Dosage</span>
                     <select 
                       className="w-full p-2 border rounded text-sm outline-none bg-white"
                       value={newMed.dosage}
                       onChange={(e) => setNewMed({...newMed, dosage: e.target.value})}
                     >
                       <option>1-0-1</option>
                       <option>1-1-1</option>
                       <option>1-0-0</option>
                       <option>0-0-1</option>
                       <option>SOS</option>
                     </select>
                  </div>
                  <div className="flex-1">
                     <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Duration</span>
                     <input 
                       type="text" 
                       className="w-full p-2 border rounded text-sm outline-none"
                       placeholder="5 Days"
                       value={newMed.duration}
                       onChange={(e) => setNewMed({...newMed, duration: e.target.value})}
                     />
                  </div>
                  <div className="flex-[1.5]">
                     <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Instruction</span>
                     <input 
                       type="text" 
                       className="w-full p-2 border rounded text-sm outline-none"
                       placeholder="After Food"
                       value={newMed.note}
                       onChange={(e) => setNewMed({...newMed, note: e.target.value})}
                     />
                  </div>
                  <button onClick={addMedicine} className="bg-[#1e3a29] text-white p-2 rounded hover:bg-[#162b1e] transition">
                    <Plus size={20}/>
                  </button>
                </div>

                {currentPrescription.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-[#1e3a29] text-white text-xs uppercase">
                        <tr>
                          <th className="p-3 font-medium">Medicine</th>
                          <th className="p-3 font-medium">Dosage</th>
                          <th className="p-3 font-medium">Duration</th>
                          <th className="p-3 font-medium">Instruction</th>
                          <th className="p-3 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {currentPrescription.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="p-3 font-medium text-[#1e3a29]">{item.medicine}</td>
                            <td className="p-3">{item.dosage}</td>
                            <td className="p-3">{item.duration}</td>
                            <td className="p-3 text-gray-500">{item.instruction}</td>
                            <td className="p-3 text-right">
                              <button onClick={() => removeMedicine(item.id)} className="text-red-400 hover:text-red-600 transition">
                                <Trash2 size={16}/>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                    No medicines added yet.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button className="px-6 py-3 rounded-lg text-gray-500 font-bold hover:bg-gray-100 transition">
                Cancel
              </button>
              <button onClick={handleSave} className="px-8 py-3 rounded-lg bg-[#c5a059] text-[#1e3a29] font-bold hover:bg-[#b08d4b] transition shadow-md flex items-center gap-2">
                <Save size={18} /> Save Consultation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}