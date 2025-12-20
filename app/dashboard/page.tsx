"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Calendar, Users, Pill, Activity, ArrowRight, 
  AlertTriangle, Clock, ChevronRight, Loader2, LogOut, Trash2 
} from "lucide-react";
import { getDashboardStats, completeRequest } from "@/app/actions";
import StaffHeader from "@/app/components/StaffHeader"; // <--- Import Header

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const data = await getDashboardStats();
    setStats(data);
    setLoading(false);
  }

  // Handle Manual Delete
  const handleDeleteRequest = async (id: string) => {
    if(!confirm("Are you sure you want to delete this request?")) return;
    await completeRequest(id); // Using the action we made earlier
    loadData(); // Refresh list
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#FDFBF7]">
      <Loader2 className="animate-spin text-[#c5a059]" size={48} />
    </div>
  );

  return (
    <div className="h-screen bg-[#FDFBF7] flex flex-col font-sans text-neutral-800">
      
      {/* 1. NEW NAVIGATION HEADER */}
      <StaffHeader />

      <div className="flex-1 overflow-y-auto p-8">
        {/* HEADER */}
        <header className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-4xl font-serif font-bold text-[#1e3a29] mb-2">
              Namaste, Dr. Chirag
            </h1>
            <p className="text-gray-500">Here is your clinic overview for today.</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-[#c5a059] uppercase tracking-wider">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </header>

        {/* QUICK STATS ROW */}
        <div className="grid grid-cols-3 gap-6 mb-10">
          {/* Card 1: Appointments */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Appointments Today</p>
              <h2 className="text-4xl font-serif font-bold text-[#1e3a29]">{stats.appointments}</h2>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
              <Calendar size={24}/>
            </div>
          </div>

          {/* Card 2: Pharmacy Queue */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Pending Prescriptions</p>
              <h2 className="text-4xl font-serif font-bold text-[#1e3a29]">{stats.queue}</h2>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stats.queue > 0 ? 'bg-orange-50 text-orange-600 animate-pulse' : 'bg-green-50 text-green-600'}`}>
              <Clock size={24}/>
            </div>
          </div>

          {/* Card 3: Low Stock Alert */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Low Stock Alerts</p>
              <h2 className={`text-4xl font-serif font-bold ${stats.lowStock > 0 ? 'text-red-600' : 'text-[#1e3a29]'}`}>
                {stats.lowStock}
              </h2>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stats.lowStock > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'}`}>
              <AlertTriangle size={24}/>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT COLUMN */}
          <div className="space-y-8">
            
            {/* 2. PENDING WEB REQUESTS (UPDATED) */}
            <div className="bg-white rounded-xl shadow-sm border border-[#c5a059]/30 overflow-hidden">
              <div className="bg-[#fff9f0] px-6 py-4 border-b border-[#c5a059]/10 flex justify-between items-center">
                <h3 className="font-serif font-bold text-[#1e3a29] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                  Website Consultation Requests
                </h3>
                <span className="text-xs font-bold text-[#c5a059] uppercase">{stats?.requests?.length || 0} Pending</span>
              </div>
              
              <div className="divide-y divide-gray-100">
                {stats?.requests?.map((req: any) => (
                  <div key={req.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div>
                        <p className="font-bold text-[#1e3a29]">{req.name}</p>
                        <p className="text-xs text-gray-500">📞 {req.phone}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-400 italic mb-1">{req.symptoms || "No symptoms listed"}</p>
                        <div className="flex gap-2 justify-end">
                          <a href={`tel:${req.phone}`} className="text-xs bg-gray-100 px-3 py-1 rounded hover:bg-gray-200 font-bold border border-gray-300">Call</a>
                          
                          {/* DELETE BUTTON */}
                          <button onClick={() => handleDeleteRequest(req.id)} className="text-xs bg-red-50 text-red-500 px-2 py-1 rounded hover:bg-red-100 border border-red-200">
                            <Trash2 size={14}/>
                          </button>

                          {/* BOOK SLOT BUTTON (PASSES DATA TO URL) */}
                          <Link 
                            href={`/calendar?reqId=${req.id}&name=${encodeURIComponent(req.name)}&phone=${req.phone}`} 
                            className="text-xs bg-[#1e3a29] text-white px-3 py-1 rounded hover:bg-[#2a4d38] font-bold shadow-sm"
                          >
                            Book Slot
                          </Link>
                        </div>
                    </div>
                  </div>
                ))}
                {(!stats?.requests || stats.requests.length === 0) && (
                    <div className="p-6 text-center text-gray-400 text-sm">No new requests.</div>
                )}
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div>
              <h3 className="text-xl font-serif font-bold text-[#1e3a29] mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-4">
                <Link href="/calendar" className="group block bg-white border border-gray-200 p-6 rounded-xl shadow-sm hover:shadow-md hover:border-[#c5a059] transition cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="bg-[#1e3a29] text-white p-3 rounded-lg">
                      <Calendar size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-[#1e3a29] group-hover:text-[#c5a059] transition">Calendar</h4>
                      <p className="text-xs text-gray-500">Manage Appointments</p>
                    </div>
                  </div>
                </Link>

                <Link href="/pharmacy" className="group block bg-white border border-gray-200 p-6 rounded-xl shadow-sm hover:shadow-md hover:border-[#c5a059] transition cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="bg-[#1e3a29] text-white p-3 rounded-lg">
                      <Pill size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-[#1e3a29] group-hover:text-[#c5a059] transition">Pharmacy</h4>
                      <p className="text-xs text-gray-500">Dispense & Stock</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: RECENT ACTIVITY */}
          <div>
            <h3 className="text-xl font-serif font-bold text-[#1e3a29] mb-4">Recent Appointments</h3>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {stats.recent.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No activity recorded today.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {stats.recent.map((apt: any) => (
                    <div key={apt.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-[#c5a059]"></div>
                        <div>
                          <p className="font-bold text-[#1e3a29] text-sm">{apt.patientName}</p>
                          <p className="text-xs text-gray-500">{apt.type} • {apt.startTime}</p>
                        </div>
                      </div>
                      {apt.status === 'COMPLETED' ? (
                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">Done</span>
                      ) : (
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-bold">Scheduled</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="p-3 bg-gray-50 text-center border-t border-gray-100">
                <Link href="/calendar" className="text-xs font-bold text-[#1e3a29] flex items-center justify-center gap-1 hover:underline">
                  View Full Schedule <ChevronRight size={12}/>
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}