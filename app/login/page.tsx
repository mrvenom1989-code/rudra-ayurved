"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image"; 
import Link from "next/link";
import { Lock, Mail, Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { loginAction } from "@/app/actions"; 

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); 
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
        // We pass the email exactly as typed, the server will handle the case-insensitive match
        const result = await loginAction(email.trim(), password);

        if (result.success) {
            router.push("/dashboard");
        } else {
            setError(result.error || "Invalid credentials.");
            setLoading(false);
        }
    } catch (err) {
        console.error("Login Failed:", err);
        setError("System Error: Please check Vercel Logs.");
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1e3a29] flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 opacity-10 bg-[url('/grid-pattern.svg')]"></div>

      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative z-10 animate-in fade-in zoom-in duration-300">
        
        <div className="bg-gray-50 p-8 pb-6 text-center border-b border-gray-100 flex flex-col items-center">
          <div className="relative w-20 h-20 mb-3">
              <Image 
                src="/rudralogo.png" 
                alt="Rudra Ayurved Logo" 
                fill
                className="object-contain"
                priority
              />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#B09B5C] tracking-wide">
            RUDRA AYURVED
          </h1>
          <span className="text-[10px] font-bold text-[#1e3a29] tracking-[0.2em] uppercase mt-1">
            Multi - Speciality Panchkarma Hospital
          </span>
          <div className="mt-6 flex items-center gap-2 text-xs font-bold uppercase text-gray-400 tracking-wider">
              <Lock size={12} /> Staff Portal Access
          </div>
        </div>

        <div className="p-8 pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Email Field */}
            <div>
               <label className="block text-xs font-bold uppercase text-gray-500 mb-1 ml-1">Email ID</label>
               <div className="relative">
                 <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                 <input 
                   type="email" 
                   required 
                   className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#c5a059] focus:ring-1 focus:ring-[#c5a059] transition-all bg-gray-50 focus:bg-white"
                   placeholder="doctor@rudra.com" 
                   value={email} 
                   onChange={(e) => setEmail(e.target.value)} 
                 />
               </div>
            </div>

            {/* Password Field */}
            <div>
               <label className="block text-xs font-bold uppercase text-gray-500 mb-1 ml-1">Password</label>
               <div className="relative">
                 <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                 <input 
                   type={showPassword ? "text" : "password"}
                   required 
                   // ✅ FIXED: Added [&::-ms-reveal]:hidden to hide the browser's duplicate eye icon
                   className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#c5a059] focus:ring-1 focus:ring-[#c5a059] transition-all bg-gray-50 focus:bg-white [&::-ms-reveal]:hidden"
                   placeholder="••••••••" 
                   value={password} 
                   onChange={(e) => setPassword(e.target.value)} 
                 />
                 
                 <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-[#c5a059] transition-colors focus:outline-none"
                 >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                 </button>
               </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-500 text-xs font-bold p-3 rounded-lg text-center border border-red-100 flex items-center justify-center gap-2 animate-pulse">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                {error}
              </div>
            )}

            <button 
              disabled={loading} 
              className="w-full bg-[#1e3a29] text-white font-bold py-3 rounded-lg hover:bg-[#162b1e] active:scale-[0.98] transition-all flex items-center justify-center shadow-lg shadow-[#1e3a29]/20"
            >
              {loading ? <Loader2 className="animate-spin" size={20}/> : "Login to Dashboard"}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-gray-100 pt-6">
              <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-[#c5a059] transition-colors">
                <ArrowLeft size={14} /> Back to Home Page
              </Link>
          </div>
        </div>

      </div>
    </div>
  );
}