"use client";

import { useState, useEffect } from "react";
import StaffHeader from "@/app/components/StaffHeader";
import { 
  Users, UserPlus, Trash2, Shield, Stethoscope, 
  Mail, Lock, Loader2 
} from "lucide-react";
// 👇 Make sure this import points to your actions.ts file
import { getUsers, createUser, deleteUser } from "./actions"; 

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "DOCTOR", 
    specialty: ""
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
        const data = await getUsers();
        setUsers(data);
    } catch (e) {
        console.error("Failed to load users", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createUser(formData);
    
    if (res.success) {
      alert("User created successfully!");
      setIsModalOpen(false);
      setFormData({ name: "", email: "", password: "", role: "DOCTOR", specialty: "" });
      loadUsers();
    } else {
      alert(res.error || "Error creating user");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to remove this user? They will lose access immediately.")) {
      await deleteUser(id);
      loadUsers();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <StaffHeader />

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-6">
        
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-serif font-bold text-[#1e3a29] flex items-center gap-2">
              <Shield className="text-[#c5a059]" /> User Management
            </h2>
            <p className="text-gray-500 text-sm">Manage doctor, staff, and admin access</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#1e3a29] text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#2c4e3b] transition"
          >
            <UserPlus size={18} /> Add New User
          </button>
        </div>

        {/* USERS LIST */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-10 text-center"><Loader2 className="animate-spin inline mr-2"/> Loading...</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 text-gray-600 font-bold uppercase text-xs">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Email / Login ID</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 group">
                    <td className="p-4 font-bold text-[#1e3a29] flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold">
                         {user.name.charAt(0)}
                       </div>
                       <div>
                         {user.name}
                         {user.specialty && <span className="block text-xs text-gray-400 font-normal">{user.specialty}</span>}
                       </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'DOCTOR' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">{user.email}</td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleDelete(user.id)}
                        className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition"
                        title="Delete User"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* CREATE USER MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
               <div className="bg-[#1e3a29] p-4 text-white flex justify-between items-center">
                 <h3 className="font-bold flex items-center gap-2"><UserPlus size={18}/> New User Account</h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-300 hover:text-white">✕</button>
               </div>
               
               <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Full Name</label>
                    <input required type="text" className="w-full p-2 border rounded text-sm" placeholder="Dr. Name or Staff Name"
                      value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Email (Login ID)</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 text-gray-400" size={16} />
                      <input required type="email" className="w-full p-2 pl-9 border rounded text-sm" placeholder="doctor@rudra.com"
                        value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 text-gray-400" size={16} />
                      <input required type="password" className="w-full p-2 pl-9 border rounded text-sm" placeholder="••••••••"
                        value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Role</label>
                      <select className="w-full p-2 border rounded text-sm bg-white"
                        value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                        <option value="DOCTOR">Doctor</option>
                        <option value="ADMIN">Admin</option>
                        <option value="STAFF">Reception / Staff</option>
                      </select>
                    </div>
                    {formData.role === 'DOCTOR' && (
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Specialty</label>
                        <input type="text" className="w-full p-2 border rounded text-sm" placeholder="e.g. Ayurveda"
                          value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} />
                      </div>
                    )}
                  </div>

                  <button type="submit" className="w-full bg-[#c5a059] text-[#1e3a29] font-bold py-2 rounded shadow-md hover:bg-[#b08d4b] transition mt-2">
                    Create Account
                  </button>
               </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}