"use client";

import { useState, useEffect } from "react"; // 👈 Imported hooks
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, Calendar, Pill, LogOut, Users, User, BarChart 
} from "lucide-react"; 
import { getCurrentUserRole } from "@/app/actions"; // 👈 Import the new action

export default function StaffHeader() {
  const pathname = usePathname();
  const [role, setRole] = useState<string>(""); // 👈 State to store role

  // Fetch Role on Mount
  useEffect(() => {
    async function fetchRole() {
      const r = await getCurrentUserRole();
      setRole(r);
    }
    fetchRole();
  }, []);

  // Permission Check
  const isAdminOrDoctor = role === 'ADMIN' || role === 'DOCTOR';

  // Helper for active link styles
  const isActive = (path: string) => 
    pathname.startsWith(path)
      ? "bg-[#c5a059] text-[#1e3a29]" 
      : "text-gray-400 hover:text-white";

  return (
    <nav className="bg-white border-b border-gray-200 p-2 px-6 flex justify-between items-center shadow-sm shrink-0 z-50 relative h-20">
      
      {/* --- Logo Section --- */}
      <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-95 transition">
        <div className="relative w-14 h-14">
           <Image 
             src="/rudralogo.png" 
             alt="Rudra Ayurved Logo" 
             fill
             className="object-contain"
             priority
           />
        </div>
        <div className="leading-tight flex flex-col justify-center">
           <h1 className="font-serif text-2xl font-bold text-[#B09B5C] tracking-wide">
             RUDRA AYURVED
           </h1>
           <span className="text-[10px] font-bold text-[#1e3a29] tracking-[0.2em] uppercase">
             Multi - Speciality Panchkarma Hospital
           </span>
        </div>
      </Link>

      {/* --- Navigation Links --- */}
      <div className="flex items-center bg-[#1e3a29] rounded-full p-1.5 gap-1 shadow-inner">
        <Link 
          href="/dashboard" 
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition ${isActive('/dashboard')}`}
        >
          <Home size={16} /> Dashboard
        </Link>

        <Link 
          href="/patients" 
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition ${isActive('/patients')}`}
        >
          <User size={16} /> Patients
        </Link>

        <Link 
          href="/calendar" 
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition ${isActive('/calendar')}`}
        >
          <Calendar size={16} /> Calendar
        </Link>

        <Link 
          href="/pharmacy" 
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition ${isActive('/pharmacy')}`}
        >
          <Pill size={16} /> Pharmacy
        </Link>

        {/* 🔒 RESTRICTED: REPORTS (Only Admin & Doctor) */}
        {isAdminOrDoctor && (
          <Link 
            href="/reports" 
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition ${isActive('/reports')}`}
          >
            <BarChart size={16} /> Reports
          </Link>
        )}

        {/* 🔒 RESTRICTED: USERS (Only Admin & Doctor) */}
        {isAdminOrDoctor && (
          <Link 
            href="/admin/users" 
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition ${isActive('/admin/users')}`}
          >
            <Users size={16} /> Users
          </Link>
        )}
      </div>

      {/* --- Logout --- */}
      <Link href="/" className="flex items-center gap-2 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 px-3 py-2 rounded-full transition">
        <LogOut size={16} /> Logout
      </Link>

    </nav>
  );
}