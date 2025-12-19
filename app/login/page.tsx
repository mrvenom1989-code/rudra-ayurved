"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";
import { loginAction } from "@/app/actions";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await loginAction(email, password);

    if (result.success) {
      router.push("/dashboard");
    } else {
      setError("Invalid credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-[#1e3a29] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
           <h1 className="text-2xl font-serif font-bold text-[#1e3a29]">Staff Portal</h1>
           <p className="text-gray-500 text-sm mt-2">Enter your credentials to access the system.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
           <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Email ID</label>
              <input type="email" required className="w-full p-3 border rounded-lg" placeholder="admin@rudra.com" value={email} onChange={(e) => setEmail(e.target.value)} />
           </div>
           <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Password</label>
              <input type="password" required className="w-full p-3 border rounded-lg" placeholder="admin123" value={password} onChange={(e) => setPassword(e.target.value)} />
           </div>
           {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
           <button disabled={loading} className="w-full bg-[#1e3a29] text-white font-bold py-3 rounded-lg hover:bg-[#162b1e] flex items-center justify-center">
             {loading ? <Loader2 className="animate-spin" size={20}/> : "Access Dashboard"}
           </button>
        </form>
        <div className="mt-6 text-center">
           <a href="/" className="text-xs text-gray-400 hover:text-[#1e3a29]">← Back to Website</a>
        </div>
      </div>
    </div>
  );
}