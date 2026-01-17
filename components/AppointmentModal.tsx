"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  X, Calendar as CalIcon, Clock, User, Phone, 
  Trash2, Ban, Search, Loader2, Stethoscope, Repeat, Plus 
} from "lucide-react";
import { searchPatients } from "@/app/actions"; 

// --- HELPER: Time Converters ---

// ✅ HELPER: Convert 12h to 24h for internal state logic
const to24h = (time12h: string) => {
    if (!time12h) return "";
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') hours = '00';
    if (modifier === 'PM') hours = (parseInt(hours, 10) + 12).toString();
    return `${hours.padStart(2, '0')}:${minutes}`;
};

// ✅ HELPER: Convert 24h to 12h for saving/display
const to12h = (time24h: string) => {
    if (!time24h) return "";
    const [hours, minutes] = time24h.split(':');
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const adjustedH = h % 12 || 12;
    return `${adjustedH.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${suffix}`;
};

// --- Time Slot Generator (Returns both formats) ---
const generateTimeSlots = () => {
  const slots = [];
  let startHour = 7; 
  let endHour = 20;
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += 10) { 
      if (h === endHour && m > 0) break;
      const date = new Date();
      date.setHours(h, m);
      
      const value = date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }); // "13:00"
      const label = date.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });  // "01:00 PM"
      
      slots.push({ value, label });
    }
  }
  return slots;
};
const TIME_SLOTS = generateTimeSlots();

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  const [phone, setPhone] = useState(""); 
  const [doctor, setDoctor] = useState("Dr. Chirag Raval");
  const [type, setType] = useState("Consultation");
  const [date, setDate] = useState("");
  
  // ✅ FIX: Use 24h format for state to ensure correct comparison logic
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("10:10"); 

  // Recurring State
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringCount, setRecurringCount] = useState("3");
  const [frequency, setFrequency] = useState("daily"); 
  const [customDates, setCustomDates] = useState<string[]>([]);

  // Search State
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  // --- Load Data on Open ---
  useEffect(() => {
    if (isOpen) {
      // Reset Recurring State
      setIsRecurring(false);
      setRecurringCount("3");
      setFrequency("daily");
      setCustomDates([]);

      if (existingAppointment) {
        setPatientName(existingAppointment.patientName || "");
        setPatientId(existingAppointment.patientId || null);
        setPhone(existingAppointment.phone || "");
        setDoctor(existingAppointment.doctor || "Dr. Chirag Raval");
        setType(existingAppointment.type || "Consultation");
        setDate(existingAppointment.date || "");
        
        // ✅ Convert incoming 12h time to 24h for internal state
        setStartTime(to24h(existingAppointment.startTime || "10:00 AM"));
        setEndTime(to24h(existingAppointment.endTime || "10:10 AM"));
        
      } else if (initialData) {
        setPatientName(initialData.patientName || ""); 
        setPatientId(null);
        setPhone(initialData.phone || "");
        setDoctor("Dr. Chirag Raval");
        setType("Consultation");
        setDate(initialData.date);
        
        // ✅ Convert initial 12h time to 24h
        const start24 = to24h(initialData.startTime);
        setStartTime(start24);
        
        // Auto-select next slot
        const startIndex = TIME_SLOTS.findIndex(s => s.value === start24);
        if (startIndex !== -1 && startIndex < TIME_SLOTS.length - 1) {
          setEndTime(TIME_SLOTS[startIndex + 1].value); 
        } else {
          setEndTime(start24);
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

  // --- Update Custom Dates Array ---
  useEffect(() => {
      if (frequency === 'custom') {
          const count = parseInt(recurringCount) || 1;
          const needed = count - 1; 
          
          if (needed > customDates.length) {
              setCustomDates(prev => [...prev, ...Array(needed - prev.length).fill("")]);
          } else if (needed < customDates.length) {
              setCustomDates(prev => prev.slice(0, needed));
          }
      }
  }, [recurringCount, frequency]);

  const handleCustomDateChange = (index: number, val: string) => {
      const newDates = [...customDates];
      newDates[index] = val;
      setCustomDates(newDates);
  };

  // --- Handlers ---
  const handleSelectPatient = (patient: any) => {
    setPatientName(patient.name);
    setPhone(patient.phone);
    setPatientId(patient.id);
    setShowResults(false);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPatientName(e.target.value);
    setPatientId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Client Side Validation (24h comparison works correctly)
    if (startTime >= endTime) {
        alert("End time must be after start time.");
        return;
    }

    const recurringData = isRecurring ? {
        count: parseInt(recurringCount) || 1,
        frequency: frequency,
        customDates: frequency === 'custom' ? customDates : undefined 
    } : undefined;

    onSave({
      id: existingAppointment?.id || undefined, 
      patientName: type === 'Unavailable' ? 'BLOCKED' : patientName,
      phone: type === 'Unavailable' ? '-' : phone,
      doctor,
      type,
      date,
      // ✅ FIX: Convert back to 12h before saving so Calendar View works
      startTime: to12h(startTime),
      endTime: to12h(endTime),
      patientId: patientId,
      recurring: recurringData 
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
        alert("Please click 'Confirm' to save the appointment first.");
      }
  };

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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Entry Type */}
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
                       {TIME_SLOTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <span className="self-center">-</span>
                    <select className="w-full p-2 border rounded text-sm" value={endTime} onChange={(e) => setEndTime(e.target.value)}>
                       {/* Only show end times strictly after start time */}
                       {TIME_SLOTS.map(t => (
                           t.value > startTime && <option key={t.value} value={t.value}>{t.label}</option>
                       ))}
                    </select>
                 </div>
              </div>
          </div>

          {/* Recurring Options */}
          {!existingAppointment && type !== 'Unavailable' && (
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 transition-all">
                 <div className="flex items-center gap-2 mb-2">
                    <input 
                        type="checkbox" 
                        id="repeat" 
                        checked={isRecurring} 
                        onChange={(e) => setIsRecurring(e.target.checked)}
                        className="w-4 h-4 text-[#c5a059] focus:ring-[#c5a059] border-gray-300 rounded cursor-pointer"
                    />
                    <label htmlFor="repeat" className="text-sm font-bold text-gray-700 flex items-center gap-2 cursor-pointer select-none">
                        <Repeat size={14} className="text-[#c5a059]"/> Repeat Appointment
                    </label>
                 </div>

                 {isRecurring && (
                    <div className="animate-in slide-in-from-top-1 pl-6 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                           <div>
                             <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Frequency</label>
                             <select className="w-full p-1.5 border rounded text-sm bg-white" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                                 <option value="daily">Daily</option>
                                 <option value="weekly">Weekly</option>
                                 <option value="biweekly">Bi-Weekly</option>
                                 <option value="monthly">Monthly</option>
                                 <option value="custom">Custom Dates</option>
                             </select>
                           </div>
                           <div>
                             <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Total Sessions</label>
                             <input 
                                 type="number" 
                                 min="2" max="30"
                                 className="w-full p-1.5 border rounded text-sm bg-white" 
                                 value={recurringCount}
                                 onChange={(e) => setRecurringCount(e.target.value)}
                             />
                           </div>
                        </div>
                        
                        {frequency === 'custom' && (
                           <div className="space-y-2 mt-2">
                               <p className="text-[10px] font-bold uppercase text-gray-400">Select Additional Dates:</p>
                               <div className="max-h-32 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                   {customDates.map((d, i) => (
                                       <div key={i} className="flex items-center gap-2">
                                            <span className="text-xs font-mono text-gray-500 w-6">#{i+2}</span>
                                            <input 
                                                type="date" 
                                                className="flex-1 p-1 border rounded text-xs bg-white"
                                                value={d}
                                                onChange={(e) => handleCustomDateChange(i, e.target.value)}
                                                required
                                            />
                                       </div>
                                   ))}
                               </div>
                           </div>
                        )}
                    </div>
                 )}
              </div>
          )}

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
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">WhatsApp <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <input 
                    type="tel" 
                    required 
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