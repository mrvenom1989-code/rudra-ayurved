"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  Calendar, Users, Activity, 
  AlertTriangle, Clock, ChevronRight, Loader2, Trash2,
  RefreshCw, CheckCircle, BadgePercent, X, MessageCircle, ListChecks 
} from "lucide-react";
import { getDashboardStats, completeRequest, completeAppointment } from "@/app/actions"; 
import StaffHeader from "@/app/components/StaffHeader"; 

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- MODAL STATES ---
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isBulkReminderModalOpen, setIsBulkReminderModalOpen] = useState(false);
  
  const [selectedApt, setSelectedApt] = useState<any>(null);
  const [apptDiscount, setApptDiscount] = useState("0");
  
  // Track sent reminders locally for the session
  const [sentReminders, setSentReminders] = useState<string[]>([]);

  // --- DATA LOADING ---
  const loadData = useCallback(async (isBackground = false) => {
    if (!isBackground) setRefreshing(true);
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error("Dashboard Load Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial & Auto Refresh
  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 30000); 
    return () => clearInterval(interval);
  }, [loadData]);

  // Handle Manual Delete
  const handleDeleteRequest = async (id: string) => {
    if(!confirm("Are you sure you want to delete this request?")) return;
    await completeRequest(id); 
    loadData(); 
  };

  // --- HANDLE APPOINTMENT COMPLETION ---
  const openCompleteModal = (apt: any) => {
    setSelectedApt(apt);
    setApptDiscount("0");
    setIsCompleteModalOpen(true);
  };

  const handleConfirmCompletion = async () => {
    if (!selectedApt) return;
    await completeAppointment(selectedApt.id, parseFloat(apptDiscount) || 0);
    setIsCompleteModalOpen(false);
    setSelectedApt(null);
    loadData(); 
  };

  // ✅ WhatsApp Reminder Logic
  const handleWhatsAppReminder = (apt: any) => {
    if (!apt.phone) return alert("No phone number found for this patient.");

    // 1. Clean Phone
    let phone = apt.phone.replace(/[^0-9]/g, '');
    if (phone.length === 10) phone = "91" + phone;

    // 2. Format Date
    const dateObj = new Date(apt.date);
    const dateStr = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    // 3. Construct Message
    const message = `Namaste ${apt.patientName}, this is a reminder for your appointment at Rudra Ayurved with ${apt.doctor} on ${dateStr} at ${apt.startTime}. Please reply to confirm.`;

    // 4. Open WhatsApp & Mark as Sent locally
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    
    // Mark as sent in local state
    setSentReminders(prev => [...prev, apt.id]);
  };

  // ✅ FILTER 1: Show appointments greater than current time (For Main Dashboard)
  const getFilteredUpcoming = () => {
      if (!stats?.upcoming) return [];
      const now = new Date();
      
      return stats.upcoming.filter((apt: any) => {
          const aptDate = new Date(apt.date);
          if (aptDate > now && aptDate.getDate() !== now.getDate()) return true;
          if (aptDate.getDate() === now.getDate() && aptDate.getMonth() === now.getMonth() && aptDate.getFullYear() === now.getFullYear()) {
             const [time, modifier] = apt.startTime.split(' ');
             let [hours, minutes] = time.split(':');
             if (hours === '12') hours = '00';
             if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
             const aptTime = new Date();
             aptTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
             return aptTime > now;
          }
          return false;
      });
  };

  // ✅ FILTER 2: Get Today's & Tomorrow's Appointments (For Bulk List)
  const getBulkAppointments = () => {
      if (!stats?.upcoming) return [];
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const endTomorrow = new Date(tomorrow);
      endTomorrow.setHours(23, 59, 59, 999);

      return stats.upcoming.filter((apt: any) => {
          const aptDate = new Date(apt.date);
          // Return if date is Today OR Tomorrow
          return aptDate >= today && aptDate <= endTomorrow;
      });
  };

  const filteredUpcoming = getFilteredUpcoming();
  const bulkAppointments = getBulkAppointments(); // Updated variable name

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#FDFBF7]">
      <Loader2 className="animate-spin text-[#c5a059]" size={48} />
    </div>
  );

  return (
    <div className="h-screen bg-[#FDFBF7] flex flex-col font-sans text-neutral-800">
      
      {/* HEADER NAVIGATION */}
      <StaffHeader />

      <div className="flex-1 overflow-y-auto p-8">
        {/* DASHBOARD HEADER */}
        <header className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-4xl font-serif font-bold text-[#1e3a29] mb-2">
              Namaste, {stats?.userName || "Doctor"} 
            </h1>
            <p className="text-gray-500">Here is your clinic overview.</p>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <p className="text-sm font-bold text-[#c5a059] uppercase tracking-wider">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <button 
              onClick={() => loadData()} 
              disabled={refreshing}
              className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-[#1e3a29] transition disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Updating..." : "Refresh Data"}
            </button>
          </div>
        </header>

        {/* 1. CLICKABLE STATS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          
          <Link href="/calendar" className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md hover:border-[#c5a059] transition">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Appointments Today</p>
              <h2 className="text-4xl font-serif font-bold text-[#1e3a29]">{stats?.appointments || 0}</h2>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition">
              <Calendar size={24}/>
            </div>
          </Link>

          <Link href="/pharmacy" className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md hover:border-[#c5a059] transition">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Pending Prescriptions</p>
              <h2 className="text-4xl font-serif font-bold text-[#1e3a29]">{stats?.queue || 0}</h2>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition ${stats?.queue > 0 ? 'bg-orange-50 text-orange-600 animate-pulse' : 'bg-green-50 text-green-600'}`}>
              <Clock size={24}/>
            </div>
          </Link>

          <Link href="/pharmacy?tab=inventory" className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md hover:border-[#c5a059] transition">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Low Stock Alerts</p>
              <h2 className={`text-4xl font-serif font-bold ${stats?.lowStock > 0 ? 'text-red-600' : 'text-[#1e3a29]'}`}>
                {stats?.lowStock || 0}
              </h2>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition ${stats?.lowStock > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'}`}>
              <AlertTriangle size={24}/>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          
          {/* SECTION 2: WEB REQUESTS */}
          <div className="bg-white rounded-xl shadow-sm border border-[#c5a059]/30 overflow-hidden h-full">
              <div className="bg-[#fff9f0] px-6 py-4 border-b border-[#c5a059]/10 flex justify-between items-center">
                <h3 className="font-serif font-bold text-[#1e3a29] flex items-center gap-2">
                  {stats?.requests?.length > 0 && <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>}
                  Website Requests
                </h3>
                <span className="text-xs font-bold text-[#c5a059] uppercase">{stats?.requests?.length || 0} Pending</span>
              </div>
              
              <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                {stats?.requests?.map((req: any) => (
                  <div key={req.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                    <div>
                        <p className="font-bold text-[#1e3a29]">{req.name}</p>
                        <p className="text-xs text-gray-500">📞 {req.phone}</p>
                        <div className="mt-1 bg-orange-50 text-orange-800 text-xs px-2 py-1 rounded inline-block font-medium">
                           Note: {req.symptoms || "Consultation Request"}
                        </div>
                    </div>
                    <div className="flex gap-2 items-center">
                       <button onClick={() => handleDeleteRequest(req.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition" title="Delete Request">
                          <Trash2 size={16}/>
                       </button>
                       <Link 
                          href={`/calendar?reqId=${req.id}&name=${encodeURIComponent(req.name)}&phone=${req.phone}`} 
                          className="text-xs bg-[#1e3a29] text-white px-4 py-2 rounded-lg hover:bg-[#2a4d38] font-bold shadow-sm flex items-center gap-2"
                       >
                          <Calendar size={14}/> Book Slot
                       </Link>
                    </div>
                  </div>
                ))}
                {(!stats?.requests || stats.requests.length === 0) && (
                    <div className="p-12 text-center text-gray-400 text-sm italic">
                       No pending requests from the website.
                    </div>
                )}
              </div>
          </div>

          {/* SECTION 3: UPCOMING SCHEDULE */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-serif font-bold text-[#1e3a29] flex items-center gap-2">
                  <Users className="text-[#c5a059]" size={20}/> Upcoming Schedule
                </h3>
                
                {/* BULK REMINDER BUTTON */}
                <button 
                  onClick={() => setIsBulkReminderModalOpen(true)}
                  className="text-xs bg-[#1e3a29] text-white px-3 py-1.5 rounded-full hover:bg-[#2a4d38] flex items-center gap-1.5 transition shadow-sm"
                >
                   <ListChecks size={14}/> Bulk Reminders
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto max-h-[300px]">
                {(filteredUpcoming.length === 0) ? (
                    <div className="p-10 text-center text-gray-400 text-sm">No upcoming appointments.</div>
                ) : (
                    <table className="w-full text-sm text-left">
                       <thead className="bg-gray-100 text-gray-500 text-xs uppercase sticky top-0 z-10">
                          <tr>
                             <th className="p-3">Time</th>
                             <th className="p-3">Patient</th>
                             <th className="p-3">Info</th>
                             <th className="p-3">Action</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                          {filteredUpcoming.map((apt:any) => {
                             const isToday = new Date(apt.date).getDate() === new Date().getDate();
                             const isSent = sentReminders.includes(apt.id) || apt.reminderSent;
                             return (
                                <tr key={apt.id} className="hover:bg-gray-50 transition">
                                   <td className="p-3">
                                      <div className="font-bold text-[#1e3a29]">{apt.startTime}</div>
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isToday ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                         {isToday ? 'TODAY' : 'TMROW'}
                                      </span>
                                   </td>
                                   <td className="p-3 font-medium">
                                      {apt.patientName}
                                      <div className="text-[10px] text-gray-400">📞 {apt.phone}</div>
                                   </td>
                                   <td className="p-3">
                                      <div className="text-xs font-bold text-gray-600">{apt.doctor}</div>
                                      <div className="text-[10px] text-gray-400">{apt.type}</div>
                                   </td>
                                   <td className="p-3 flex items-center gap-2">
                                      {/* WhatsApp Button */}
                                      <button 
                                        onClick={() => handleWhatsAppReminder(apt)}
                                        className={`p-2 rounded-full transition ${isSent ? 'bg-green-100 text-green-700' : 'text-[#25D366] hover:bg-green-50'}`} 
                                        title="Send WhatsApp Reminder"
                                      >
                                        {isSent ? <CheckCircle size={20}/> : <MessageCircle size={20} />}
                                      </button>
                                      
                                      <button 
                                        onClick={() => openCompleteModal(apt)}
                                        className="text-green-600 hover:bg-green-50 p-2 rounded-full transition" 
                                        title="Complete Appointment"
                                      >
                                        <CheckCircle size={20} />
                                      </button>
                                   </td>
                                </tr>
                             )
                          })}
                       </tbody>
                    </table>
                )}
             </div>
          </div>
        </div>

        {/* SECTION 4: COMPLETED TODAY */}
        <div className="mt-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                 <h3 className="font-serif font-bold text-[#1e3a29] flex items-center gap-2">
                    <CheckCircle className="text-green-600" size={18}/> Completed Today
                 </h3>
                 <span className="text-xs font-bold text-gray-400">Recent 5</span>
              </div>
              
              <div className="divide-y divide-gray-100">
                  {(!stats?.recent || stats.recent.length === 0) ? (
                    <div className="p-8 text-center text-gray-400 text-sm">No completed appointments yet today.</div>
                  ) : (
                    stats.recent.map((apt: any) => (
                      <Link key={apt.id} href={`/patients/${apt.patientId}`} className="group p-4 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs">
                             {apt.patientName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-[#1e3a29] text-sm group-hover:text-[#c5a059] transition">{apt.patientName}</p>
                            <p className="text-xs text-gray-500">{apt.type} • {apt.doctor}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <span className="text-xs text-gray-400">
                              {new Date(apt.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                           </span>
                           <ChevronRight size={16} className="text-gray-300 group-hover:text-[#c5a059]"/>
                        </div>
                      </Link>
                    ))
                  )}
              </div>
            </div>
        </div>

      </div>

      {/* --- COMPLETE APPOINTMENT MODAL --- */}
      {isCompleteModalOpen && selectedApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
              <div className="bg-[#1e3a29] p-4 text-white flex justify-between items-center">
                 <h3 className="font-bold">Complete Appointment</h3>
                 <button onClick={() => setIsCompleteModalOpen(false)}><X size={20}/></button>
              </div>
              <div className="p-6">
                 <p className="text-sm text-gray-600 mb-4">
                   Marking appointment for <span className="font-bold text-[#1e3a29]">{selectedApt.patientName}</span> as completed.
                 </p>
                 
                 <div className="mb-4">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Apply Discount (₹)</label>
                    <div className="flex items-center border rounded px-3 py-2 focus-within:ring-2 focus-within:ring-[#c5a059]">
                       <BadgePercent size={16} className="text-gray-400 mr-2"/>
                       <input 
                          type="number" 
                          className="w-full text-sm outline-none font-bold text-[#1e3a29]"
                          placeholder="0"
                          value={apptDiscount}
                          onChange={(e) => setApptDiscount(e.target.value)}
                       />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                       Standard Fee: ₹500. Final Bill: ₹{500 - (parseFloat(apptDiscount) || 0)}
                    </p>
                 </div>

                 <button 
                    onClick={handleConfirmCompletion}
                    className="w-full bg-[#1e3a29] text-white py-3 rounded-lg font-bold text-sm hover:bg-[#162b1e] transition shadow-md flex justify-center items-center gap-2"
                 >
                    <CheckCircle size={16}/> Confirm Completion
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* --- BULK REMINDER MODAL (UPDATED) --- */}
      {isBulkReminderModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[80vh]">
                 <div className="bg-[#1e3a29] p-4 text-white flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="font-bold flex items-center gap-2"><ListChecks size={20}/> Bulk Reminders</h3>
                        <p className="text-[10px] text-gray-300">Showing appointments for Today & Tomorrow</p>
                    </div>
                    <button onClick={() => setIsBulkReminderModalOpen(false)}><X size={20}/></button>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-0">
                    <table className="w-full text-sm text-left">
                       <thead className="bg-gray-100 text-gray-500 text-xs uppercase sticky top-0">
                          <tr>
                             <th className="p-3">Time</th>
                             <th className="p-3">Patient</th>
                             <th className="p-3">Phone</th>
                             <th className="p-3 text-right">Action</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                          {bulkAppointments.length === 0 ? (
                              <tr><td colSpan={4} className="p-8 text-center text-gray-400">No appointments scheduled.</td></tr>
                          ) : (
                              bulkAppointments.map((apt: any) => {
                                  const isSent = sentReminders.includes(apt.id) || apt.reminderSent;
                                  const isToday = new Date(apt.date).getDate() === new Date().getDate();
                                  
                                  return (
                                      <tr key={apt.id} className={isSent ? "bg-green-50" : "hover:bg-gray-50"}>
                                          <td className="p-3">
                                              <div className="font-bold text-[#1e3a29]">{apt.startTime}</div>
                                              {isToday && <span className="text-[9px] bg-green-100 text-green-700 px-1 rounded font-bold">TODAY</span>}
                                          </td>
                                          <td className="p-3 font-medium">{apt.patientName}</td>
                                          <td className="p-3 text-gray-500 text-xs font-mono">{apt.phone}</td>
                                          <td className="p-3 text-right">
                                              <button 
                                                  onClick={() => handleWhatsAppReminder(apt)}
                                                  disabled={isSent}
                                                  className={`text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1 ml-auto transition ${
                                                      isSent 
                                                      ? "bg-green-200 text-green-800 cursor-not-allowed" 
                                                      : "bg-[#25D366] text-white hover:bg-[#1ebc57]"
                                                  }`}
                                              >
                                                  {isSent ? <CheckCircle size={12}/> : <MessageCircle size={12}/>}
                                                  {isSent ? "Sent" : "Send"}
                                              </button>
                                          </td>
                                      </tr>
                                  );
                              })
                          )}
                       </tbody>
                    </table>
                 </div>
                 
                 <div className="p-3 bg-gray-50 border-t text-center text-xs text-gray-500">
                    Tip: Click "Send" to open WhatsApp. The button will turn green to help you track progress.
                 </div>
             </div>
          </div>
      )}

    </div>
  );
}