"use client";

import { User, Scale, Leaf, ChevronUp, ChevronDown } from "lucide-react";
import { cleanName } from "../utils";

interface PatientDetailsCardProps {
    patient: any;
    setPatient: (patient: any) => void;
    isEditingDetails: boolean;
    setIsEditingDetails: (editing: boolean) => void;
    handleSaveDetails: () => void;
    savingDetails: boolean;
    showExtendedDetails: boolean;
    setShowExtendedDetails: (show: boolean) => void;
}

export default function PatientDetailsCard({
    patient, setPatient, isEditingDetails, setIsEditingDetails, handleSaveDetails, savingDetails, showExtendedDetails, setShowExtendedDetails
}: PatientDetailsCardProps) {
    if (!patient) return null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-[#1e3a29] p-4 flex justify-between items-center">
                <h3 className="text-white font-bold flex items-center gap-2"><User size={18} /> Personal Details</h3>
                <button onClick={() => isEditingDetails ? handleSaveDetails() : setIsEditingDetails(true)} disabled={savingDetails} className="bg-[#c5a059] text-[#1e3a29] px-3 py-1 rounded text-xs font-bold disabled:opacity-50">
                    {savingDetails ? "Saving..." : (isEditingDetails ? "Save" : "Edit")}
                </button>
            </div>
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div><label className="text-xs font-bold text-gray-400 uppercase">Name</label>{isEditingDetails ? <input className="w-full border-b font-medium" value={patient.name} onChange={e => setPatient({ ...patient, name: e.target.value })} /> : <p className="font-bold text-xl">{cleanName(patient.name)}</p>}</div>
                <div className="flex gap-4">
                    <div className="flex-1"><label className="text-xs text-gray-400 uppercase">Age</label>{isEditingDetails ? <input type="number" className="w-full border-b" value={patient.age} onChange={e => setPatient({ ...patient, age: e.target.value })} /> : <p>{patient.age} Y</p>}</div>
                    <div className="flex-1"><label className="text-xs text-gray-400 uppercase">Gender</label>{isEditingDetails ? <select className="w-full border-b" value={patient.gender} onChange={e => setPatient({ ...patient, gender: e.target.value })}><option>Male</option><option>Female</option></select> : <p>{patient.gender}</p>}</div>
                </div>
                <div><label className="text-xs font-bold text-gray-400 uppercase">Phone</label>{isEditingDetails ? <input className="w-full border-b" value={patient.phone} onChange={e => setPatient({ ...patient, phone: e.target.value })} /> : <p>{patient.phone}</p>}</div>
                <div><label className="text-xs font-bold text-gray-400 uppercase">History / Allergies</label>{isEditingDetails ? <textarea className="w-full border p-1 text-sm rounded" rows={2} value={patient.history || ""} onChange={e => setPatient({ ...patient, history: e.target.value })} /> : <p className="text-sm italic text-gray-600">{patient.history || "-"}</p>}</div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-dashed">
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"><Scale size={10} /> Weight</label>{isEditingDetails ? <div className="flex gap-1"><input placeholder="Cur" className="w-10 border-b text-sm" value={patient.currentWeight || ""} onChange={e => setPatient({ ...patient, currentWeight: e.target.value })} /><span className="text-gray-400">/</span><input placeholder="Init" className="w-10 border-b text-sm" value={patient.initialWeight || ""} onChange={e => setPatient({ ...patient, initialWeight: e.target.value })} /></div> : <p className="text-sm font-bold text-gray-700">{patient.currentWeight || "-"} / {patient.initialWeight || "-"}</p>}</div>
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"><Leaf size={10} /> Prakriti</label>{isEditingDetails ? <input className="w-full border-b text-sm" value={patient.prakriti || ""} onChange={e => setPatient({ ...patient, prakriti: e.target.value })} /> : <p className="text-sm font-bold text-purple-700">{patient.prakriti || "-"}</p>}</div>
                </div>
                <button onClick={() => setShowExtendedDetails(!showExtendedDetails)} className="text-xs font-bold text-[#c5a059] flex items-center gap-1 w-full justify-center border-t border-b py-2">{showExtendedDetails ? <><ChevronUp size={14} /> Show Less</> : <><ChevronDown size={14} /> Show Medical History</>}</button>
                {showExtendedDetails && (
                    <div className="space-y-4 pt-2 animate-in slide-in-from-top-2">
                        <div><label className="text-xs font-bold text-gray-400 uppercase">Chief Complaints</label>{isEditingDetails ? <textarea className="w-full border p-1 text-sm rounded" rows={2} value={(patient as any).chiefComplaints || ""} onChange={e => setPatient({ ...patient, chiefComplaints: e.target.value })} /> : <p className="text-sm whitespace-pre-wrap">{(patient as any).chiefComplaints || "-"}</p>}</div>
                        <div><label className="text-xs font-bold text-gray-400 uppercase">K/C/O</label>{isEditingDetails ? <input className="w-full border-b text-sm" value={(patient as any).kco || ""} onChange={e => setPatient({ ...patient, kco: e.target.value })} /> : <p className="text-sm">{(patient as any).kco || "-"}</p>}</div>
                        <div><label className="text-xs font-bold text-gray-400 uppercase">Current Meds</label>{isEditingDetails ? <textarea className="w-full border p-1 text-sm rounded" value={(patient as any).currentMedications || ""} onChange={e => setPatient({ ...patient, currentMedications: e.target.value })} /> : <p className="text-sm">{(patient as any).currentMedications || "-"}</p>}</div>
                        <div><label className="text-xs font-bold text-gray-400 uppercase">Investigations</label>{isEditingDetails ? <textarea className="w-full border p-1 text-sm rounded" value={(patient as any).investigations || ""} onChange={e => setPatient({ ...patient, investigations: e.target.value })} /> : <p className="text-sm">{(patient as any).investigations || "-"}</p>}</div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase">Past History</label>{isEditingDetails ? <textarea className="w-full border p-1 text-xs rounded" value={(patient as any).pastHistory || ""} onChange={e => setPatient({ ...patient, pastHistory: e.target.value })} /> : <p className="text-xs">{(patient as any).pastHistory || "-"}</p>}</div>
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase">Family History</label>{isEditingDetails ? <textarea className="w-full border p-1 text-xs rounded" value={(patient as any).familyHistory || ""} onChange={e => setPatient({ ...patient, familyHistory: e.target.value })} /> : <p className="text-xs">{(patient as any).familyHistory || "-"}</p>}</div>
                        </div>
                        <div><label className="text-xs font-bold text-gray-400 uppercase">Mental Generals</label>{isEditingDetails ? <textarea className="w-full border p-1 text-sm rounded" value={(patient as any).mentalGenerals || ""} onChange={e => setPatient({ ...patient, mentalGenerals: e.target.value })} /> : <p className="text-sm">{(patient as any).mentalGenerals || "-"}</p>}</div>
                        <div><label className="text-xs font-bold text-gray-400 uppercase">OBS/GYN History</label>{isEditingDetails ? <textarea className="w-full border p-1 text-sm rounded" value={(patient as any).obsGynHistory || ""} onChange={e => setPatient({ ...patient, obsGynHistory: e.target.value })} /> : <p className="text-sm">{(patient as any).obsGynHistory || "-"}</p>}</div>
                        <div><label className="text-xs font-bold text-gray-400 uppercase block mb-1">Physical Generals</label>{isEditingDetails ? <textarea className="w-full border p-2 text-xs font-mono rounded bg-gray-50 h-64" value={(patient as any).physicalGenerals} onChange={e => setPatient({ ...patient, physicalGenerals: e.target.value })} /> : <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans bg-gray-50 p-2 rounded">{(patient as any).physicalGenerals}</pre>}</div>
                    </div>
                )}
            </div>
        </div>
    );
}
