"use client";

import { useState, useEffect } from "react";
import StaffHeader from "@/app/components/StaffHeader";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { 
  Download, Printer, IndianRupee, FileText, Loader2, Users, Activity, 
  Pill, Scale, X, Sparkles, Eye, Lock
} from "lucide-react";
import { getReportData } from "@/app/actions";

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [filter, setFilter] = useState<'ALL' | 'APPOINTMENT' | 'PHARMACY' | 'PANCHKARMA'>('ALL'); // ✅ Added Panchkarma
  
  const [showWeightLossModal, setShowWeightLossModal] = useState(false);

  // ✅ Revenue Masking State
  const [isRevenueVisible, setIsRevenueVisible] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [showPinInput, setShowPinInput] = useState(false);

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [dateRange, setDateRange] = useState({
    start: firstDay,
    end: lastDay
  });

  useEffect(() => {
    loadReports();
  }, [dateRange]);

  const loadReports = async () => {
    setLoading(true);
    try {
        const result = await getReportData(dateRange.start, dateRange.end);
        setData(result);
    } catch (e) {
        console.error("Report Error", e);
    } finally {
        setLoading(false);
    }
  };

  const filteredTransactions = data?.rawTransactions.filter((t: any) => {
      if (filter === 'ALL') return true;
      return t.type === filter;
  }) || [];

  const handleExport = () => {
    if (!data) return;
    const headers = ["Date", "Type", "Appt ID", "Patient Name", "Detail", "Amount (INR)"];
    const rows = filteredTransactions.map((item: any) => [
        new Date(item.date).toLocaleDateString('en-GB'),
        item.type,
        item.appointmentId,
        item.patient,
        item.detail,
        item.amount
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `report_${filter}_${dateRange.start}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePinCheck = (val: string) => {
      setPinInput(val);
      if (val === "1989") {
          setIsRevenueVisible(true);
          setShowPinInput(false);
          setPinInput("");
      }
  };

  function RefreshCwIcon({size}:{size:number}) {
    return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col font-sans text-neutral-800">
      <div className="print:hidden">
        <StaffHeader />
      </div>

      <div className="flex-1 p-8 max-w-7xl mx-auto w-full">
        {/* Header Controls */}
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-8 gap-4 print:hidden">
           <div>
              <h1 className="text-3xl font-serif font-bold text-[#1e3a29]">Clinic Reports</h1>
              <p className="text-gray-500 text-sm mt-1">Analytics and performance overview.</p>
           </div>

           <div className="flex gap-2 items-center bg-white p-2 rounded-lg border shadow-sm">
              <div className="flex items-center gap-2 px-2">
                 <span className="text-xs font-bold text-gray-500 uppercase">From</span>
                 <input type="date" className="text-sm outline-none bg-transparent" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
              </div>
              <span className="text-gray-300">|</span>
              <div className="flex items-center gap-2 px-2">
                 <span className="text-xs font-bold text-gray-500 uppercase">To</span>
                 <input type="date" className="text-sm outline-none bg-transparent" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
              </div>
              <button onClick={loadReports} className="bg-[#1e3a29] text-white p-2 rounded hover:bg-[#162b1e] transition">
                 <RefreshCwIcon size={16}/>
              </button>
           </div>

           <div className="flex gap-2">
              <button onClick={() => window.print()} className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50">
                 <Printer size={16}/> Print
              </button>
              <button onClick={handleExport} className="flex items-center gap-2 bg-[#c5a059] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#b08d4b]">
                 <Download size={16}/> Export CSV
              </button>
           </div>
        </div>

        {/* --- PRINT HEADER --- */}
        <div className="hidden print:block mb-8 text-center border-b pb-4">
            <h1 className="text-2xl font-bold text-black">RUDRA AYURVED - REPORT</h1>
            <p className="text-sm text-gray-600">
               Period: {new Date(dateRange.start).toLocaleDateString('en-GB')} to {new Date(dateRange.end).toLocaleDateString('en-GB')}
            </p>
        </div>

        {loading ? (
           <div className="h-64 flex items-center justify-center text-[#c5a059]">
              <Loader2 className="animate-spin" size={48} />
           </div>
        ) : data && (
           <div className="space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 print:grid-cols-4">
                 
                 {/* ✅ Total Revenue (Masked) */}
                 <div 
                    onClick={() => setFilter('ALL')}
                    className={`p-6 rounded-xl shadow-sm border cursor-pointer transition transform hover:scale-105 ${filter === 'ALL' ? 'bg-[#1e3a29] text-white border-[#1e3a29]' : 'bg-white border-gray-100 text-[#1e3a29]'}`}
                 >
                    <div className="flex justify-between items-start">
                       <div>
                          <p className={`text-xs font-bold uppercase tracking-wider ${filter === 'ALL' ? 'text-white/70' : 'text-gray-400'}`}>Total Revenue</p>
                          <div className="mt-1 flex items-center gap-2 h-8">
                             {isRevenueVisible ? (
                                <h3 className="text-2xl font-bold">₹ {data.summary.totalRevenue.toLocaleString()}</h3>
                             ) : (
                                showPinInput ? (
                                    <input 
                                        autoFocus
                                        type="password" 
                                        className="w-24 bg-white/20 border border-white/30 text-white rounded px-2 py-1 text-sm outline-none placeholder-white/50"
                                        placeholder="PIN"
                                        value={pinInput}
                                        onChange={(e) => handlePinCheck(e.target.value)}
                                        onBlur={() => setShowPinInput(false)}
                                    />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-2xl font-bold">****</h3>
                                        <button onClick={(e) => { e.stopPropagation(); setShowPinInput(true); }} className="opacity-70 hover:opacity-100"><Eye size={18}/></button>
                                    </div>
                                )
                             )}
                          </div>
                       </div>
                       <div className={`p-2 rounded-lg ${filter === 'ALL' ? 'bg-white/20' : 'bg-green-50 text-green-700'}`}>
                           {isRevenueVisible ? <IndianRupee size={24}/> : <Lock size={24}/>}
                       </div>
                    </div>
                 </div>

                 {/* Appointments */}
                 <div 
                    onClick={() => setFilter('APPOINTMENT')}
                    className={`p-6 rounded-xl shadow-sm border cursor-pointer transition transform hover:scale-105 ${filter === 'APPOINTMENT' ? 'bg-[#c5a059] text-white border-[#c5a059]' : 'bg-white border-gray-100 text-[#1e3a29]'}`}
                 >
                    <div className="flex justify-between items-start">
                       <div>
                          <p className={`text-xs font-bold uppercase tracking-wider ${filter === 'APPOINTMENT' ? 'text-white/70' : 'text-gray-400'}`}>Appointments</p>
                          <h3 className="text-2xl font-bold mt-1">{data.summary.totalPatients}</h3>
                       </div>
                       <div className={`p-2 rounded-lg ${filter === 'APPOINTMENT' ? 'bg-white/20' : 'bg-blue-50 text-blue-700'}`}><Users size={24}/></div>
                    </div>
                    <p className={`text-[10px] mt-2 ${filter === 'APPOINTMENT' ? 'text-white/80' : 'text-gray-400'}`}>
                        {isRevenueVisible ? `₹ ${data.summary.appointmentRevenue.toLocaleString()}` : '****'} Generated
                    </p>
                 </div>

                 {/* Pharmacy */}
                 <div 
                    onClick={() => setFilter('PHARMACY')}
                    className={`p-6 rounded-xl shadow-sm border cursor-pointer transition transform hover:scale-105 ${filter === 'PHARMACY' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white border-gray-100 text-[#1e3a29]'}`}
                 >
                    <div className="flex justify-between items-start">
                       <div>
                          <p className={`text-xs font-bold uppercase tracking-wider ${filter === 'PHARMACY' ? 'text-white/70' : 'text-gray-400'}`}>Pharmacy Sales</p>
                          <h3 className="text-2xl font-bold mt-1">{data.summary.totalPrescriptions}</h3>
                       </div>
                       <div className={`p-2 rounded-lg ${filter === 'PHARMACY' ? 'bg-white/20' : 'bg-orange-50 text-orange-700'}`}><Pill size={24}/></div>
                    </div>
                    <p className={`text-[10px] mt-2 ${filter === 'PHARMACY' ? 'text-white/80' : 'text-gray-400'}`}>
                        {isRevenueVisible ? `₹ ${data.summary.pharmacyRevenue.toLocaleString()}` : '****'} Generated
                    </p>
                 </div>

                 {/* ✅ Panchkarma Card */}
                 <div 
                    onClick={() => setFilter('PANCHKARMA')}
                    className={`p-6 rounded-xl shadow-sm border cursor-pointer transition transform hover:scale-105 ${filter === 'PANCHKARMA' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white border-gray-100 text-[#1e3a29]'}`}
                 >
                    <div className="flex justify-between items-start">
                       <div>
                          <p className={`text-xs font-bold uppercase tracking-wider ${filter === 'PANCHKARMA' ? 'text-white/70' : 'text-gray-400'}`}>Panchkarma</p>
                          <h3 className="text-sm font-bold mt-2 opacity-80">Procedures</h3>
                       </div>
                       <div className={`p-2 rounded-lg ${filter === 'PANCHKARMA' ? 'bg-white/20' : 'bg-purple-50 text-purple-700'}`}><Sparkles size={24}/></div>
                    </div>
                    <p className={`text-[10px] mt-2 ${filter === 'PANCHKARMA' ? 'text-white/80' : 'text-gray-400'}`}>
                        {isRevenueVisible ? `₹ ${data.summary.panchkarmaRevenue.toLocaleString()}` : '****'} Generated
                    </p>
                 </div>

                 {/* Weight Loss Card */}
                 <div 
                    onClick={() => setShowWeightLossModal(true)}
                    className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 cursor-pointer transition transform hover:scale-105 hover:shadow-md"
                 >
                    <div className="flex justify-between items-start mb-3">
                       <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Weight Loss</p>
                          <h3 className="text-2xl font-bold mt-1 text-[#1e3a29]">{data.summary.totalWeightLoss?.toFixed(1) || 0} <span className="text-sm font-normal text-gray-500">kg</span></h3>
                       </div>
                       <div className="p-2 bg-pink-50 text-pink-700 rounded-lg"><Scale size={24}/></div>
                    </div>
                    
                    {/* Gender Breakdown */}
                    <div className="space-y-2 mt-2">
                       <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-blue-600 w-8">Male</span>
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                             <div className="h-full bg-blue-500" style={{ width: `${data.summary.totalWeightLoss > 0 ? (data.summary.weightLossByGender?.Male / data.summary.totalWeightLoss) * 100 : 0}%` }}></div>
                          </div>
                          <span className="text-[10px] font-bold text-gray-600">{data.summary.weightLossByGender?.Male?.toFixed(1) || 0}</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-pink-600 w-8">Fem</span>
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                             <div className="h-full bg-pink-500" style={{ width: `${data.summary.totalWeightLoss > 0 ? (data.summary.weightLossByGender?.Female / data.summary.totalWeightLoss) * 100 : 0}%` }}></div>
                          </div>
                          <span className="text-[10px] font-bold text-gray-600">{data.summary.weightLossByGender?.Female?.toFixed(1) || 0}</span>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:break-inside-avoid">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
                    <h3 className="font-bold text-[#1e3a29] mb-4">Revenue Overview (Daily Breakdown)</h3>
                    {isRevenueVisible ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.charts.revenueOverTime}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" tickFormatter={(str) => new Date(str).getDate().toString()} tick={{fontSize: 12}} />
                                <YAxis tick={{fontSize: 12}} />
                                <Tooltip 
                                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                                    labelFormatter={(label) => new Date(label).toLocaleDateString('en-GB')} 
                                />
                                <Legend />
                                <Bar dataKey="appointment" name="Appointments" stackId="a" fill="#c5a059" radius={[0, 0, 0, 0]} barSize={20} />
                                <Bar dataKey="pharmacy" name="Pharmacy" stackId="a" fill="#1e3a29" radius={[0, 0, 0, 0]} barSize={20} />
                                <Bar dataKey="panchkarma" name="Panchkarma" stackId="a" fill="#9333ea" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400 flex-col gap-2">
                            <Lock size={32}/>
                            <p className="text-sm">Revenue chart is locked</p>
                        </div>
                    )}
                 </div>

                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
                    <h3 className="font-bold text-[#1e3a29] mb-4">Top 5 Selling Medicines</h3>
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart layout="vertical" data={data.charts.topMedicines} margin={{left: 20}}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} />
                          <Tooltip cursor={{fill: 'transparent'}} />
                          <Bar dataKey="count" fill="#E86C42" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fill: '#666', fontSize: 12 }}/>
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
              </div>

              {/* Transactions Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border">
                 <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-[#1e3a29]">
                       {filter === 'ALL' ? 'All Transactions' : filter === 'PHARMACY' ? 'Pharmacy Sales' : filter === 'PANCHKARMA' ? 'Panchkarma Procedures' : 'Appointment History'}
                    </h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{filteredTransactions.length} records</span>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                       <thead className="bg-[#1e3a29] text-white text-xs uppercase">
                          <tr>
                             <th className="p-3">Date</th>
                             <th className="p-3">Type</th>
                             <th className="p-3">Appt ID</th>
                             <th className="p-3">Patient</th>
                             <th className="p-3">Detail</th>
                             <th className="p-3 text-right">Amount</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                          {filteredTransactions.map((item: any) => (
                             <tr key={item.id} className="hover:bg-gray-50">
                                <td className="p-3 text-gray-500">
                                   {new Date(item.date).toLocaleDateString('en-GB')} 
                                   <span className="block text-[10px]">{new Date(item.date).toLocaleTimeString()}</span>
                                </td>
                                <td className="p-3">
                                   <span className={`text-[10px] font-bold px-2 py-1 rounded ${item.type === 'APPOINTMENT' ? 'bg-blue-100 text-blue-700' : item.type === 'PANCHKARMA' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                                      {item.type}
                                   </span>
                                </td>
                                <td className="p-3 font-mono text-xs text-gray-600">
                                   {item.appointmentId}
                                </td>
                                <td className="p-3 font-medium text-[#1e3a29]">{item.patient}</td>
                                <td className="p-3 text-gray-600">{item.detail}</td>
                                <td className="p-3 text-right font-bold text-[#1e3a29]">
                                    {isRevenueVisible ? `₹ ${item.amount}` : '****'}
                                </td>
                             </tr>
                          ))}
                          {filteredTransactions.length === 0 && (
                             <tr><td colSpan={6} className="p-8 text-center text-gray-400">No records found for this category.</td></tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>

           </div>
        )}

        {/* Weight Loss Modal */}
        {showWeightLossModal && data && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col animate-in zoom-in-95">
                    <div className="bg-[#1e3a29] p-4 flex justify-between items-center text-white rounded-t-xl shrink-0">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                           <Scale size={20}/> Weight Loss Achievers
                        </h3>
                        <button onClick={() => setShowWeightLossModal(false)} className="hover:text-red-300"><X size={24}/></button>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto">
                        {data.weightLossPatients && data.weightLossPatients.length > 0 ? (
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100 text-xs uppercase text-gray-600 sticky top-0">
                                    <tr>
                                        <th className="p-3 text-left">Patient</th>
                                        <th className="p-3 text-center">Initial</th>
                                        <th className="p-3 text-center">Current</th>
                                        <th className="p-3 text-right">Lost</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {data.weightLossPatients.map((p: any) => (
                                        <tr key={p.id}>
                                            <td className="p-3">
                                                <div className="font-bold text-[#1e3a29]">{p.name}</div>
                                                <div className="text-xs text-gray-500">{p.readableId}</div>
                                            </td>
                                            <td className="p-3 text-center text-gray-600">{p.initial}</td>
                                            <td className="p-3 text-center text-gray-600">{p.current}</td>
                                            <td className="p-3 text-right font-bold text-green-600">-{p.loss} kg</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-center text-gray-400 py-10">No weight loss records found.</p>
                        )}
                    </div>
                    <div className="p-4 border-t text-center text-xs text-gray-500">
                        Total Weight Lost: <span className="font-bold text-[#1e3a29]">{data.summary.totalWeightLoss?.toFixed(1)} kg</span>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}