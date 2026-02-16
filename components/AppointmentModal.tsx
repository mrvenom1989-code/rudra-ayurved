"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  X, Ban, Search, Loader2, Stethoscope, Repeat, User, Phone
} from "lucide-react";
import { searchPatients } from "@/app/actions";

// ✅ HELPER: Convert 12h to 24h for internal state logic
const to24h = (time12h: string) => {
  if (!time12h) return "";
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');

  if (modifier) {
    if (hours === '12') hours = '00';
    if (modifier === 'PM') hours = (parseInt(hours, 10) + 12).toString();
  }

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

// ✅ FIX: Deterministic Time Slot Generation
// Generates slots from 7:00 AM to 8:00 PM in 10-minute increments
// Uses manual string construction to avoid browser locale issues (e.g. "7:00 A" vs "7:00 AM")
const generateTimeSlots = () => {
  const slots = [];
  const startHour = 7;
  const endHour = 20; // 8 PM

  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += 10) {
      if (h === endHour && m > 0) break; // Stop at 20:00 exactly

      const hStr = h.toString().padStart(2, '0');
      const mStr = m.toString().padStart(2, '0');
      const value = `${hStr}:${mStr}`; // "07:30" (24h for value)

      // Manual 12h formatting
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      const h12Str = h12.toString().padStart(2, '0');
      const label = `${h12Str}:${mStr} ${ampm}`; // "07:30 AM" (Always standard)

      slots.push({ value, label });
    }
  }
  return slots;
};
const TIME_SLOTS = generateTimeSlots();

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: { date?: string; startTime?: string; patientName?: string; phone?: string } | null;
  existingAppointment: any | null;
  onSave: (data: any) => void;
  onDelete: (id: string) => void;
}

export default function AppointmentModal({
  isOpen, onClose, initialData, existingAppointment, onSave, onDelete
}: AppointmentModalProps) {

  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);

  /* 
     ✅ REFACTOR: State initialization is now handled via the `key` prop in the parent.
     When `key` changes, this component remounts, so we use initializers here.
  */

  const [patientName, setPatientName] = useState(existingAppointment?.patientName || initialData?.patientName || "");
  const [patientId, setPatientId] = useState<string | null>(existingAppointment?.patientId || null);
  const [phone, setPhone] = useState(existingAppointment?.phone || initialData?.phone || "");
  const [doctor, setDoctor] = useState(existingAppointment?.doctor || "Dr. Chirag Raval");
  const [type, setType] = useState(existingAppointment?.type || "Consultation");

  // ✅ Ensure date is a valid string
  const initialDate = existingAppointment?.date
    ? existingAppointment.date.toString().split('T')[0]
    : (initialData?.date || "");
  const [date, setDate] = useState(initialDate);

  const [startTime, setStartTime] = useState(() => {
    if (existingAppointment?.startTime) return to24h(existingAppointment.startTime);
    if (initialData?.startTime) return to24h(initialData.startTime);
    return "10:00";
  });

  const [endTime, setEndTime] = useState(() => {
    if (existingAppointment?.endTime) return to24h(existingAppointment.endTime);
    if (initialData?.startTime) {
      const start24 = to24h(initialData.startTime);
      const startIndex = TIME_SLOTS.findIndex(s => s.value === start24);
      if (startIndex !== -1 && startIndex < TIME_SLOTS.length - 1) {
        return TIME_SLOTS[startIndex + 1].value;
      }
      return start24;
    }
    return "10:10";
  });

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringCount, setRecurringCount] = useState("3");
  const [frequency, setFrequency] = useState("daily");
  const [customDates, setCustomDates] = useState<string[]>([]);

  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  // ✅ HANDLERS for Recurring Logic (Replaces useEffect)
  const updateCustomDates = (newCount: string, newFreq: string) => {
    if (newFreq === 'custom') {
      const count = parseInt(newCount) || 1;
      const needed = count - 1;
      setCustomDates(prev => {
        if (needed > prev.length) return [...prev, ...Array(needed - prev.length).fill("")];
        if (needed < prev.length) return prev.slice(0, needed);
        return prev;
      });
    }
  };

  const handleFrequencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFreq = e.target.value;
    setFrequency(newFreq);
    updateCustomDates(recurringCount, newFreq);
  };

  const handleRecurringCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCount = e.target.value;
    setRecurringCount(newCount);
    updateCustomDates(newCount, frequency);
  };

  // Removed useEffect blocks for initialization and recurring logic (lines 86-128 and 147-158)

  // ✅ Auto-update endTime if it becomes invalid (less than or equal to startTime)
  useEffect(() => {
    if (startTime >= endTime) {
      const startIndex = TIME_SLOTS.findIndex(s => s.value === startTime);
      if (startIndex !== -1 && startIndex < TIME_SLOTS.length - 1) {
        setEndTime(TIME_SLOTS[startIndex + 1].value);
      }
    }
  }, [startTime, endTime]);

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

  const handleCustomDateChange = (index: number, val: string) => {
    const newDates = [...customDates];
    newDates[index] = val;
    setCustomDates(newDates);
  };

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

    console.log("Validating Time:", { startTime, endTime, comparison: startTime >= endTime });

    if (startTime >= endTime) {
      // Just in case the effect hasn't run yet or failed
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

        <div className={`p-4 flex justify-between items-center text-white ${type === 'Unavailable' ? 'bg-gray-600' : 'bg-[#1e3a29]'}`}>
          <h3 className="font-serif text-xl font-bold flex items-center gap-2">
            {type === 'Unavailable' && <Ban size={20} />}
            {existingAppointment ? "Edit Details" : "New Entry"}
          </h3>
          <button onClick={onClose} className="hover:text-[#c5a059] transition"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">

          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Entry Type</label>
            <div className="grid grid-cols-2 gap-2">
              {['Consultation', 'Panchkarma-1', 'Panchkarma-2', 'Panchkarma-3', 'Unavailable'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-2 text-xs font-medium rounded-md border transition ${type === t
                    ? (t === 'Unavailable' ? 'bg-gray-600 text-white border-gray-600' : 'bg-[#1e3a29] text-white border-[#1e3a29]')
                    : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
                    }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

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
                  {TIME_SLOTS.map(t => (
                    t.value > startTime && <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

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
                  <Repeat size={14} className="text-[#c5a059]" /> Repeat Appointment
                </label>
              </div>

              {isRecurring && (
                <div className="animate-in slide-in-from-top-1 pl-6 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Frequency</label>
                      <select className="w-full p-1.5 border rounded text-sm bg-white" value={frequency} onChange={handleFrequencyChange}>
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
                        onChange={handleRecurringCountChange}
                      />
                    </div>
                  </div>

                  {frequency === 'custom' && (
                    <div className="space-y-2 mt-2">
                      <p className="text-[10px] font-bold uppercase text-gray-400">Select Additional Dates:</p>
                      <div className="max-h-32 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {customDates.map((d, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-xs font-mono text-gray-500 w-6">#{i + 2}</span>
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
                    onFocus={() => { if (patientName.length > 1) setShowResults(true) }}
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

          <div className="flex gap-3 mt-4 pt-2 border-t">
            {patientId && (
              <button
                type="button"
                onClick={handleVisitProfile}
                className="flex-1 bg-blue-50 text-blue-600 font-bold py-2 rounded hover:bg-blue-100 text-sm flex items-center justify-center border border-blue-200"
              >
                {existingAppointment ? <Stethoscope size={16} className="mr-2" /> : <User size={16} className="mr-2" />}
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