"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format, addDays, startOfWeek, differenceInMinutes, parse, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, Ban, Loader2 } from "lucide-react";

import AppointmentModal from "@/components/AppointmentModal"; 
import StaffHeader from "@/app/components/StaffHeader";
import { getAppointments, createAppointment, updateAppointment, deleteAppointment, completeRequest } from "@/app/actions";

// --- CONFIG ---
const START_HOUR = 10;
const END_HOUR = 20;
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;
const PIXELS_PER_MINUTE = 1.8;
const SLOT_HEIGHT = 15 * PIXELS_PER_MINUTE;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

function WeeklyCalendar() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL Params
  const reqId = searchParams.get('reqId');
  const reqName = searchParams.get('name');
  const reqPhone = searchParams.get('phone');

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);
  const [editingAppointment, setEditingAppointment] = useState<any | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const loadData = async () => {
    setIsLoading(true);
    const data = await getAppointments();
    setAppointments(data);
    setIsLoading(false);
  };

  useEffect(() => {
    if (reqName && reqPhone) {
      setEditingAppointment(null);
      setInitialData({
        patientName: reqName,
        phone: reqPhone,
        date: format(new Date(), "yyyy-MM-dd"),
        startTime: "10:00 AM"
      });
      setIsModalOpen(true);
    }
  }, [reqName, reqPhone]);

  const handleSave = async (data: any) => {
    let result;
    if (editingAppointment) {
      setAppointments(prev => prev.map(a => a.id === data.id ? { ...data, id: a.id } : a));
      result = await updateAppointment(data);
    } else {
      result = await createAppointment(data);
    }

    if (!result.success) {
      alert(result.error); 
      loadData(); 
      return; 
    }

    setIsModalOpen(false);
    if (!editingAppointment && reqId) {
      await completeRequest(reqId);
      router.replace('/calendar'); 
    }
    loadData(); 
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Are you sure you want to delete this booking?")) return;
    setIsModalOpen(false);
    setAppointments(prev => prev.filter(a => a.id !== id)); 
    await deleteAppointment(id); 
  };

  const blockWholeDay = async (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    if(confirm(`Mark ${dateStr} as Holiday? (Blocks entire day)`)) {
      const holidayBlock = {
        patientName: "HOLIDAY / CLOSED",
        phone: "-", // ✅ This specific phone number caused the error before
        doctor: "All",
        date: dateStr,
        startTime: "10:00 AM",
        endTime: "08:00 PM",
        type: "Unavailable"
      };
      await createAppointment(holidayBlock);
      loadData();
    }
  };

  // ✅ FIXED OVERLAP LOGIC
  const getAppointmentStyle = (apt: any, dayAppointments: any[]) => {
    const parseTime = (t: string) => {
        const d = parse(t, 'hh:mm a', new Date());
        d.setFullYear(2000, 0, 1); // Normalize date
        return d;
    };

    const start = parseTime(apt.startTime);
    let end = parseTime(apt.endTime || apt.startTime);
    
    if (isNaN(start.getTime())) return { display: 'none' };
    if (end <= start) end.setMinutes(start.getMinutes() + 15);

    // Calculate vertical position
    const startMinutes = (start.getHours() * 60 + start.getMinutes()) - (START_HOUR * 60);
    const durationMinutes = differenceInMinutes(end, start);

    // Calculate Overlaps
    // 1. Find all events that overlap with THIS event
    const overlaps = dayAppointments.filter(other => {
        const oStart = parseTime(other.startTime);
        let oEnd = parseTime(other.endTime || other.startTime);
        if (oEnd <= oStart) oEnd.setMinutes(oStart.getMinutes() + 15);
        
        return (start < oEnd && end > oStart);
    });

    // 2. Sort them by ID to ensure consistent order
    overlaps.sort((a, b) => a.id.localeCompare(b.id));

    // 3. Determine width and left position
    const total = overlaps.length;
    const index = overlaps.findIndex(a => a.id === apt.id);
    
    return {
      top: `${startMinutes * PIXELS_PER_MINUTE}px`,
      height: `${Math.max(durationMinutes * PIXELS_PER_MINUTE, 30)}px`,
      width: `${100 / total}%`, // Share width equally
      left: `${(index * 100) / total}%` // Stack horizontally
    };
  };

  // ✅ HELPER: GET COLOR CLASS
  const getCardColor = (apt: any) => {
    if (apt.type === 'Unavailable') return 'bg-gray-100 border-gray-400 text-gray-500 opacity-90';
    
    // Check Doctor Name for Dipal (Light Purple)
    if (apt.doctor && (apt.doctor.includes('Dipal') || apt.doctor.includes('Cosmetology'))) {
        return 'bg-purple-50 border-purple-600 text-purple-900';
    }
    
    // Default / Dr. Chirag (Green) -> Differentiates by type slightly if needed
    if (apt.type.includes('Panchkarma')) {
        return 'bg-[#c5a059]/20 border-[#c5a059] text-[#7d5f2a]'; // Goldish for Panchkarma
    }
    
    return 'bg-[#1e3a29]/10 border-[#1e3a29] text-[#1e3a29]'; // Standard Green
  };

  return (
    <div className="flex flex-col h-full">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center shrink-0 z-20 shadow-sm">
        <div>
           <h1 className="text-2xl font-serif font-bold text-[#1e3a29] flex items-center gap-2">
             Weekly Schedule {isLoading && <Loader2 className="animate-spin text-[#c5a059]" size={20}/>}
           </h1>
           <p className="text-sm text-gray-500">{isLoading ? "Loading..." : `Managing ${appointments.length} entries`}</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center bg-white border rounded-lg">
             <button onClick={() => setCurrentDate(addDays(currentDate, -7))} className="p-2 hover:bg-gray-100"><ChevronLeft size={20}/></button>
             <span className="px-4 font-medium text-[#1e3a29] w-32 text-center">{format(startDate, "MMM d")} - {format(addDays(startDate, 6), "MMM d")}</span>
             <button onClick={() => setCurrentDate(addDays(currentDate, 7))} className="p-2 hover:bg-gray-100"><ChevronRight size={20}/></button>
           </div>
           <button onClick={() => setCurrentDate(new Date())} className="bg-[#1e3a29] text-white px-4 py-2 rounded-lg text-sm">Today</button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto relative custom-scrollbar">
        <div className="flex min-w-[1000px]">
          {/* Time Labels */}
          <div className="w-16 bg-white border-r sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
             <div className="h-12 border-b bg-gray-50"></div> 
             <div className="relative" style={{ height: TOTAL_MINUTES * PIXELS_PER_MINUTE }}>
               {HOURS.map(h => (
                 <div key={h} className="absolute w-full text-right pr-2 text-xs text-gray-400 font-bold -mt-2" style={{ top: (h - START_HOUR) * 60 * PIXELS_PER_MINUTE }}>
                   {h > 12 ? h - 12 : h} {h >= 12 ? 'PM' : 'AM'}
                 </div>
               ))}
             </div>
          </div>

          {/* Days */}
          {weekDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const isToday = isSameDay(day, new Date());
            const dayAppointments = appointments.filter(a => a.date === dateStr);

            return (
              <div key={day.toString()} className="flex-1 border-r min-w-[140px] bg-white relative group/col">
                <div className={`h-12 border-b flex justify-between items-center px-2 sticky top-0 z-10 bg-white ${isToday ? 'bg-[#c5a059]/10' : ''}`}>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-gray-400">{format(day, "EEE")}</span>
                    <span className={`text-sm font-serif font-bold ${isToday ? 'text-[#c5a059]' : 'text-[#1e3a29]'}`}>{format(day, "d")}</span>
                  </div>
                  <button onClick={() => blockWholeDay(day)} title="Block Whole Day" className="text-gray-300 hover:text-red-500 opacity-0 group-hover/col:opacity-100 transition p-1"><Ban size={16} /></button>
                </div>

                <div className="relative" style={{ height: TOTAL_MINUTES * PIXELS_PER_MINUTE }}>
                  {HOURS.map(h => (
                    <div key={h} className="absolute w-full border-b border-gray-100" style={{ top: (h - START_HOUR) * 60 * PIXELS_PER_MINUTE }}></div>
                  ))}
                  
                  {/* Slots */}
                  {Array.from({ length: (END_HOUR - START_HOUR) * 4 }).map((_, i) => {
                      const minutesFromStart = i * 15;
                      const hour = START_HOUR + Math.floor(minutesFromStart / 60);
                      const minute = minutesFromStart % 60;
                      return (
                        <div key={i}
                          onClick={() => {
                            setEditingAppointment(null);
                            const timeDate = new Date();
                            timeDate.setHours(hour, minute);
                            setInitialData({ date: dateStr, startTime: format(timeDate, "hh:mm a") });
                            setIsModalOpen(true);
                          }}
                          className="absolute w-full border-b border-dashed border-gray-50 hover:bg-blue-50/30 transition cursor-pointer z-0"
                          style={{ top: minutesFromStart * PIXELS_PER_MINUTE, height: SLOT_HEIGHT }}
                        />
                      );
                  })}

                  {/* Appointments */}
                  {dayAppointments.map((apt) => (
                      <div key={apt.id}
                        onClick={(e) => { e.stopPropagation(); setEditingAppointment(apt); setIsModalOpen(true); }}
                        className={`absolute rounded-sm p-1.5 text-xs border-l-4 shadow-sm cursor-pointer z-10 overflow-hidden hover:z-20 hover:shadow-lg transition flex flex-col justify-center ${getCardColor(apt)}`}
                        style={{
                          ...getAppointmentStyle(apt, dayAppointments),
                          backgroundImage: apt.type === 'Unavailable' ? 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.05) 5px, rgba(0,0,0,0.05) 10px)' : 'none'
                        }}
                      >
                        {apt.type === 'Unavailable' ? (
                          <div className="font-bold tracking-widest text-center uppercase flex items-center justify-center gap-1"><Ban size={12}/> CLOSED</div>
                        ) : (
                          <>
                            {apt.readableId && <div className="text-[9px] font-bold opacity-70 mb-0.5">{apt.readableId}</div>}
                            <div className="font-bold truncate">{apt.patientName}</div>
                            {parseInt(getAppointmentStyle(apt, dayAppointments).height as string) > 40 && (
                               <>
                                 <div className="opacity-80 truncate text-[10px]">{apt.startTime} - {apt.endTime}</div>
                                 <div className={`inline-block px-1.5 rounded-sm mt-1 text-[9px] font-bold uppercase tracking-wider ${apt.type.includes('Panchkarma') ? 'bg-[#c5a059] text-white' : 'bg-black/5'}`}>
                                   {apt.type}
                                 </div>
                               </>
                            )}
                          </>
                        )}
                      </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AppointmentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        initialData={initialData}
        existingAppointment={editingAppointment}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}

export default function CalendarPage() {
  return (
    <div className="h-screen bg-[#FDFBF7] flex flex-col font-sans text-neutral-800">
      <StaffHeader />
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-[#c5a059]" size={40}/></div>}>
          <WeeklyCalendar />
        </Suspense>
      </div>
    </div>
  );
}