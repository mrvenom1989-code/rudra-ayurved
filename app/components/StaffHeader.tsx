"use client";

import Image from "next/image"; // Added Image import
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Pill, LogOut, Users } from "lucide-react";

export default function StaffHeader() {
  const pathname = usePathname();

  // Helper for active link styles
  const isActive = (path: string) => 
    pathname === path 
      ? "bg-[#c5a059] text-[#1e3a29]" 
      : "text-gray-400 hover:text-white";

  return (
    // Changed main background to white to match landing page logo colors
    <nav className="bg-white border-b border-gray-200 p-2 px-6 flex justify-between items-center shadow-sm shrink-0 z-50 relative h-20">
      
      {/* --- Logo Section (Updated) --- */}
      <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-95 transition">
        <div className="relative w-14 h-14">
           <Image 
             src="/Logo.png" 
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
      {/* Kept the dark pill container so the white/gray text still works perfectly */}
      <div className="flex items-center bg-[#1e3a29] rounded-full p-1.5 gap-1 shadow-inner">
        <Link 
          href="/dashboard" 
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition ${isActive('/dashboard')}`}
        >
          <Home size={16} /> Dashboard
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
        <Link 
  href="/admin/users" 
  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition ${isActive('/admin/users')}`}
>
  <Users size={16} /> Users
</Link>
      </div>

      {/* --- Logout --- */}
      {/* Changed text color to red-600 so it is visible on the white background */}
      <Link href="/" className="flex items-center gap-2 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 px-3 py-2 rounded-full transition">
        <LogOut size={16} /> Logout
      </Link>

    </nav>
  );
}