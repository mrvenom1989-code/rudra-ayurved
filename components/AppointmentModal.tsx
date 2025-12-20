"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Calendar as CalIcon, Clock, User, Phone, Trash2, Ban } from "lucide-react";

// --- Time Slot Generator ---
const generateTimeSlots = () => {
  const slots = [];
  let startHour = 10;
  let endHour = 20;
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += 15) {
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
  initialData: { date: string; startTime: string } | null;
  existingAppointment: any | null;
  onSave: (data: any) => void;
  onDelete: (id: string) => void;
}

export default function AppointmentModal({ 
  isOpen, onClose, initialData, existingAppointment, onSave, onDelete 
}: AppointmentModalProps) {
  
  const router = useRouter(); // Using router for cleaner navigation handling

  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("+91 ");
  const [doctor, setDoctor] = useState("Dr. Chirag Raval");
  const [type, setType] = useState("Consultation");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("10:00 AM");
  const [endTime, setEndTime] = useState("10:15 AM");

  useEffect(() => {
    if (isOpen) {
      if (existingAppointment) {
        setPatientName(existingAppointment.patientName || "");
        setPhone(existingAppointment.phone || "+91 ");
        setDoctor(existingAppointment.doctor || "Dr. Chirag Raval");
        setType(existingAppointment.type || "Consultation");
        setDate(existingAppointment.date || "");
        setStartTime(existingAppointment.startTime || "10:00 AM");
        setEndTime(existingAppointment.endTime || "10:15 AM");
      } else if (initialData) {
        setPatientName("");
        setPhone("+91 ");
        setDoctor("Dr. Chirag Raval");
        setType("Consultation");
        setDate(initialData.date);
        setStartTime(initialData.startTime);
        const startIndex = TIME_SLOTS.indexOf(initialData.startTime);
        if (startIndex !== -1 && startIndex < TIME_SLOTS.length - 1) {
          setEndTime(TIME_SLOTS[startIndex + 1]); 
        } else {
          setEndTime(initialData.startTime);
        }
      }
    }
  }, [isOpen, initialData, existingAppointment]);

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
      patientId: existingAppointment?.patientId // Ensure this is preserved
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
     if (existingAppointment?.patientId) {
        // Navigate to profile and close modal
        router.push(`/patients/${existingAppointment.patientId}`);
        onClose();
     }
  };

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
              {['Consultation', 'Panchakarma', 'Follow-up', 'Unavailable'].map((t) => (
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

          {/* Patient Details (Hidden if Unavailable) */}
          {type !== 'Unavailable' && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Patient Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <input type="text" required placeholder="Full Name" className="w-full p-2 pl-9 border rounded text-sm" value={patientName} onChange={(e) => setPatientName(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">WhatsApp</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <input type="tel" required placeholder="+91..." className="w-full p-2 pl-9 border rounded text-sm" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Doctor</label>
                <select className="w-full p-2 border rounded text-sm" value={doctor} onChange={(e) => setDoctor(e.target.value)}>
                  <option>Dr. Chirag Raval (Ayurveda)</option>
                  <option>Dr. Dipal Raval (Cosmetology)</option>
                </select>
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="flex gap-3 mt-4 pt-2 border-t">
            {/* VISIT PROFILE BUTTON */}
            {existingAppointment && existingAppointment.patientId && (
              <button 
                type="button"
                onClick={handleVisitProfile}
                className="flex-1 bg-blue-50 text-blue-600 font-bold py-2 rounded hover:bg-blue-100 text-sm flex items-center justify-center border border-blue-200"
              >
                <User size={16} className="mr-2"/> View Profile
              </button>
            )}

            {/* DELETE BUTTON */}
            {existingAppointment && (
              <button type="button" onClick={handleDelete} className="flex-1 bg-red-50 text-red-600 font-bold py-2 rounded hover:bg-red-100 text-sm">
                Delete
              </button>
            )}
            
            {/* SUBMIT BUTTON */}
            <button type="submit" className={`flex-[2] text-white font-bold py-2 rounded text-sm shadow-md ${type === 'Unavailable' ? 'bg-gray-600 hover:bg-gray-700' : 'bg-[#c5a059] hover:bg-[#b08d4b] text-[#1e3a29]'}`}>
              {existingAppointment ? "Update" : (type === 'Unavailable' ? "Block Time" : "Confirm")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}