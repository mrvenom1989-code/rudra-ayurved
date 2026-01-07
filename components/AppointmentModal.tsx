"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  X, Calendar as CalIcon, Clock, User, Phone, 
  Trash2, Ban, Search, Loader2, Stethoscope 
} from "lucide-react";
import { searchPatients } from "@/app/actions"; 

// --- Time Slot Generator (Updated) ---
const generateTimeSlots = () => {
  const slots = [];
  let startHour = 7; // Starts at 7 AM
  let endHour = 20;
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += 10) { // 10-minute intervals
      if (h === endHour && m > 0) break;
      const date = new Date();
      date.setHours(h, m);
      slots.push(date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
    }
  }
  return slots;
};
const TIME_SLOTS = generateTimeSlots();

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Includes optional name/phone for Dashboard pre-fill
  initialData: { date: string; startTime: string; patientName?: string; phone?: string } | null;
  existingAppointment: any | null;
  onSave: (data: any) => void;
  onDelete: (id: string) => void;
}

export default function AppointmentModal({ 
  isOpen, onClose, initialData, existingAppointment, onSave, onDelete 
}: AppointmentModalProps) {
  
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);

  // Form State
  const [patientName, setPatientName] = useState("");
  const [patientId, setPatientId] = useState<string | null>(null); 
  
  // ✅ FIX: Removed default "+91 " so field starts empty and triggers validation
  const [phone, setPhone] = useState(""); 
  
  const [doctor, setDoctor] = useState("Dr. Chirag Raval");
  const [type, setType] = useState("Consultation");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("10:00 AM");
  const [endTime, setEndTime] = useState("10:10 AM"); 

  // Search State
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  // --- Load Data on Open ---
  useEffect(() => {
    if (isOpen) {
      if (existingAppointment) {
        // EDIT MODE
        setPatientName(existingAppointment.patientName || "");
        setPatientId(existingAppointment.patientId || null);
        setPhone(existingAppointment.phone || ""); // Ensure clean value
        setDoctor(existingAppointment.doctor || "Dr. Chirag Raval");
        setType(existingAppointment.type || "Consultation");
        setDate(existingAppointment.date || "");
        setStartTime(existingAppointment.startTime || "10:00 AM");
        setEndTime(existingAppointment.endTime || "10:10 AM");
      } else if (initialData) {
        // NEW ENTRY MODE
        setPatientName(initialData.patientName || ""); 
        setPatientId(null);
        setPhone(initialData.phone || ""); // Ensure clean value
        setDoctor("Dr. Chirag Raval");
        setType("Consultation");
        setDate(initialData.date);
        setStartTime(initialData.startTime);
        
        // Auto-set 10 min slot logic
        const startIndex = TIME_SLOTS.indexOf(initialData.startTime);
        if (startIndex !== -1 && startIndex < TIME_SLOTS.length - 1) {
          setEndTime(TIME_SLOTS[startIndex + 1]); 
        } else {
          setEndTime(initialData.startTime);
        }
      }
      setSearchResults([]);
      setShowResults(false);
    }
  }, [isOpen, initialData, existingAppointment]);

  // --- Live Search Effect ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (patientName.length > 1 && !patientId && !existingAppointment) { 
        setIsSearching(true);
        const results = await searchPatients(patientName);
        setSearchResults(results);
        setIsSearching(false);
        if (results.length > 0) setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [patientName, patientId, existingAppointment]);

  // --- Handlers ---
  const handleSelectPatient = (patient: any) => {
    setPatientName(patient.name);
    setPhone(patient.phone);
    setPatientId(patient.id);
    setShowResults(false);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPatientName(e.target.value);
    setPatientId(null); // Reset ID if user types manually
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: existingAppointment?.id || undefined, 
      patientName: type === 'Unavailable' ? 'BLOCKED' : patientName,
      phone: type === 'Unavailable' ? '-' : phone,
      doctor,
      type,
      date,
      startTime,
      endTime,
      patientId: patientId 
    });
    onClose();
  };

  const handleDelete = () => {
    if (confirm("Delete this entry?")) {
      if (existingAppointment?.id) onDelete(existingAppointment.id);
      onClose();
    }
  };

  const handleVisitProfile = () => {
      if (patientId) {
        const query = existingAppointment?.readableId || existingAppointment?.id;
        const url = query ? `/patients/${patientId}?appointmentId=${query}` : `/patients/${patientId}`;
        router.push(url);
        onClose();
      } else {
        alert("Please click 'Confirm' to save the appointment first. Then click the appointment again to start the consultation.");
      }
  };

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 ${type === 'Unavailable' ? 'bg-gray-50' : 'bg-white'}`}>
        
        {/* Header */}
        <div className={`p-4 flex justify-between items-center text-white ${type === 'Unavailable' ? 'bg-gray-600' : 'bg-[#1e3a29]'}`}>
          <h3 className="font-serif text-xl font-bold flex items-center gap-2">
            {type === 'Unavailable' && <Ban size={20}/>}
            {existingAppointment ? "Edit Details" : "New Entry"}
          </h3>
          <button onClick={onClose} className="hover:text-[#c5a059] transition"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Entry Type Selector */}
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Entry Type</label>
            <div className="grid grid-cols-2 gap-2">
              {['Consultation', 'Panchkarma-1', 'Panchkarma-2', 'Panchkarma-3', 'Unavailable'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-2 text-xs font-medium rounded-md border transition ${
                    type === t 
                    ? (t === 'Unavailable' ? 'bg-gray-600 text-white border-gray-600' : 'bg-[#1e3a29] text-white border-[#1e3a29]')
                    : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
              <div>
                 <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Date</label>
                 <input type="date" required className="w-full p-2 border rounded text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                 <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Time</label>
                 <div className="flex gap-1">
                    <select className="w-full p-2 border rounded text-sm" value={startTime} onChange={(e) => setStartTime(e.target.value)}>
                       {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <span className="self-center">-</span>
                    <select className="w-full p-2 border rounded text-sm" value={endTime} onChange={(e) => setEndTime(e.target.value)}>
                       {TIME_SLOTS.map(t => (TIME_SLOTS.indexOf(t) > TIME_SLOTS.indexOf(startTime) && <option key={t} value={t}>{t}</option>))}
                    </select>
                 </div>
              </div>
          </div>

          {/* Patient Search & Details */}
          {type !== 'Unavailable' && (
            <>
              <div className="relative" ref={searchRef}>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Patient Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    required 
                    placeholder="Search or Enter Full Name" 
                    className="w-full p-2 pl-9 border rounded text-sm focus:border-[#c5a059] outline-none" 
                    value={patientName} 
                    onChange={handleNameChange}
                    onFocus={() => { if(patientName.length > 1) setShowResults(true) }}
                  />
                  {isSearching && <Loader2 className="absolute right-3 top-2.5 animate-spin text-[#c5a059]" size={16} />}
                </div>

                {/* 🔍 SEARCH RESULTS DROPDOWN */}
                {showResults && searchResults.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto z-50">
                    {searchResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPatient(p)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 border-b last:border-0 flex justify-between items-center group"
                      >
                        <div>
                          <span className="font-bold text-[#1e3a29] block">{p.name}</span>
                          <span className="text-xs text-gray-500">{p.phone}</span>
                        </div>
                        {p.readableId && (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded group-hover:bg-[#c5a059] group-hover:text-white transition">
                            {p.readableId}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                {/* ✅ REQ: Made phone number mandatory */}
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">WhatsApp <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <input 
                    type="tel" 
                    required // 👈 Added required attribute
                    placeholder="+91..." 
                    className="w-full p-2 pl-9 border rounded text-sm" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Doctor</label>
                <select className="w-full p-2 border rounded text-sm" value={doctor} onChange={(e) => setDoctor(e.target.value)}>
                  <option>Dr. Chirag Raval</option>
                  <option>Dr. Dipal Raval</option>
                </select>
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="flex gap-3 mt-4 pt-2 border-t">
            {patientId && (
              <button 
                type="button"
                onClick={handleVisitProfile}
                className="flex-1 bg-blue-50 text-blue-600 font-bold py-2 rounded hover:bg-blue-100 text-sm flex items-center justify-center border border-blue-200"
              >
                {existingAppointment ? <Stethoscope size={16} className="mr-2"/> : <User size={16} className="mr-2"/>}
                {existingAppointment ? "Start Consult" : "View Profile"}
              </button>
            )}

            {existingAppointment && (
              <button type="button" onClick={handleDelete} className="flex-1 bg-red-50 text-red-600 font-bold py-2 rounded hover:bg-red-100 text-sm">
                Delete
              </button>
            )}
            
            <button type="submit" className={`flex-[2] text-white font-bold py-2 rounded text-sm shadow-md ${type === 'Unavailable' ? 'bg-gray-600 hover:bg-gray-700' : 'bg-[#c5a059] hover:bg-[#b08d4b] text-[#1e3a29]'}`}>
              {existingAppointment ? "Update" : (type === 'Unavailable' ? "Block Time" : "Confirm")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}