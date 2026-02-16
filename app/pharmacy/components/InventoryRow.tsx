"use client";

import { memo } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { MEDICINE_TYPES } from "../constants";

interface InventoryRowProps {
    med: any;
    editingId: string | null;
    editForm: any;
    setEditForm: (form: any) => void;
    handleEdit: (med: any) => void;
    saveEdit: (id: string) => void;
    handleDelete: (id: string) => void;
}

const InventoryRow = memo(({ med, editingId, editForm, setEditForm, handleEdit, saveEdit, handleDelete }: InventoryRowProps) => {
    const isEditing = editingId === med.id;

    // ✅ STABLE LOW STOCK LOGIC: Default to 24
    const stockVal = Number(med.stock);
    const minVal = (med.minStock !== null && med.minStock !== "" && med.minStock !== undefined) ? Number(med.minStock) : 24;
    const isLowStock = stockVal < minVal;

    return (
        <tr className="hover:bg-gray-50 group">
            <td className="p-4 font-medium text-[#1e3a29]">
                {isEditing ? (
                    <input className="w-full p-1 border rounded text-sm bg-white focus:ring-2 focus:ring-[#c5a059] outline-none" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                ) : med.name}
            </td>
            <td className="p-4 text-gray-500">
                {isEditing ? (
                    <select className="w-full p-1 border rounded text-sm bg-white focus:ring-2 focus:ring-[#c5a059] outline-none" value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })}>
                        {MEDICINE_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                ) : med.type}
            </td>
            <td className="p-4">
                {isEditing ? (
                    <div className="space-y-1">
                        <input className="w-16 p-1 border rounded text-center bg-yellow-50" placeholder="Stock" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })} />
                        <input className="w-16 p-1 border rounded text-center bg-red-50 text-xs" placeholder="Min" value={editForm.minStock} onChange={(e) => setEditForm({ ...editForm, minStock: e.target.value })} />
                    </div>
                ) : (
                    <div>
                        <div className={`font-bold flex items-center gap-2 ${isLowStock ? 'text-red-500' : 'text-gray-700'}`}>
                            {med.stock} <span className="text-gray-400 text-xs font-normal">/ {minVal}</span>
                            {isLowStock && <AlertTriangle size={14} className="text-red-500" />}
                        </div>
                    </div>
                )}
            </td>
            <td className="p-4">
                {isEditing ? (
                    <div className="space-y-1">
                        <input type="date" className="w-24 p-1 border rounded text-xs" value={editForm.mfgDate} onChange={e => setEditForm({ ...editForm, mfgDate: e.target.value })} />
                        <input type="date" className="w-24 p-1 border rounded text-xs bg-red-50" value={editForm.expDate} onChange={e => setEditForm({ ...editForm, expDate: e.target.value })} />
                    </div>
                ) : (
                    <div className="text-xs text-gray-600 space-y-0.5">
                        <div><span className="font-bold text-gray-400">M:</span> {med.mfgDate ? new Date(med.mfgDate).toLocaleDateString() : "-"}</div>
                        <div><span className="font-bold text-red-300">E:</span> {med.expDate ? new Date(med.expDate).toLocaleDateString() : "-"}</div>
                    </div>
                )}
            </td>
            <td className="p-4">
                {isEditing ? <input className="w-16 p-1 border rounded text-center bg-green-50" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} /> : <span>₹ {med.price}</span>}
            </td>
            <td className="p-4 text-right flex justify-end gap-3">
                {isEditing ? <button onClick={() => saveEdit(med.id)} className="text-green-600 font-bold hover:underline">Save</button> : <><button onClick={() => handleEdit(med)} className="text-[#c5a059] font-bold hover:underline opacity-0 group-hover:opacity-100 transition">Edit</button><button onClick={() => handleDelete(med.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"><Trash2 size={16} /></button></>}
            </td>
        </tr>
    );
});

InventoryRow.displayName = "InventoryRow";
export default InventoryRow;
