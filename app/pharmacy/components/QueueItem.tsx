"use client";

import { memo } from "react";
import {
    Stethoscope, Wallet, Banknote, MessageCircle, FileText, CheckCircle, RotateCcw, Printer, Trash2
} from "lucide-react";
import { getPatientDisplayName } from "../utils";
import { updateConsultationFinancials } from "@/app/actions";

interface QueueItemProps {
    consult: any;
    dispenseQtys: { [key: string]: string };
    handleQtyChange: (id: string, val: string) => void;
    discounts: { [key: string]: string };
    discountTypes: { [key: string]: 'PERCENT' | 'VALUE' };
    handleDiscountChange: (id: string, val: string) => void;
    toggleDiscountType: (id: string) => void;
    printConsultationBill: (consult: any) => void;
    printPharmacyBill: (consult: any, isReprint: boolean) => void;
    handleDispenseAll: (items: any[]) => void;
    handleDispenseItem: (id: string) => void;
    handleReopen?: (id: string) => void;
    handleDeleteHistoryRecord?: (id: string, patientId: string) => void;
    openWalletModal: (patient: any) => void;
    isHistory?: boolean;
}

const QueueItem = memo(({
    consult, dispenseQtys, handleQtyChange, discounts, discountTypes,
    handleDiscountChange, toggleDiscountType,
    printConsultationBill, printPharmacyBill, handleDispenseAll, handleDispenseItem,
    handleReopen, handleDeleteHistoryRecord, openWalletModal, isHistory = false
}: QueueItemProps) => {

    const isDirectSale = consult.doctorName === "Pharmacy Direct Sale";
    const apptDiscount = consult.appointment?.discount || 0;
    const fee = isDirectSale ? 0 : (500 - apptDiscount);

    const displayName = getPatientDisplayName(consult);
    const displayId = consult.patient?.readableId || (isDirectSale ? "GUEST" : "-");

    const discountType = discountTypes[consult.id] || 'PERCENT';

    let currentTotal = 0;
    const items = consult.prescriptions?.[0]?.items || [];

    items.forEach((item: any) => {
        const qty = isHistory
            ? (item.dispensedQty || 1)
            : parseInt(dispenseQtys[item.id] || (item.dispensedQty ? item.dispensedQty.toString() : "1"));

        const medPrice = item.medicine?.price || 0;
        currentTotal += (qty * medPrice);
    });

    const inputDiscount = parseFloat(discounts[consult.id] || "0");
    const dbDiscount = parseFloat(consult.discount || "0");
    const effectiveDiscount = (isHistory && inputDiscount === 0) ? dbDiscount : inputDiscount;

    let discountAmountToSubtract = 0;
    if (effectiveDiscount > 0) {
        if (isHistory && inputDiscount === 0) {
            discountAmountToSubtract = effectiveDiscount;
        } else {
            if (discountType === 'PERCENT') {
                discountAmountToSubtract = (currentTotal * effectiveDiscount) / 100;
            } else {
                discountAmountToSubtract = effectiveDiscount;
            }
        }
    }

    const finalTotal = currentTotal - discountAmountToSubtract;

    const persistFinancials = async () => {
        if (isHistory) return;
        await updateConsultationFinancials(
            consult.id,
            discountAmountToSubtract,
            finalTotal,
            "Cash"
        );
    };

    const handleShareBill = () => {
        if (!consult.patient?.phone && !consult.phone) return alert("No phone number found.");
        let phone = (consult.patient?.phone || consult.phone).replace(/[^0-9]/g, '');
        if (phone.length === 10) phone = "91" + phone;
        const message = `Namaste ${displayName}, your total pharmacy bill at Rudra Ayurved is ₹${finalTotal.toFixed(0)}. Thank you for visiting us.`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const walletBalance = consult.patient?.walletBalance || 0;
    const hasWallet = consult.patient !== undefined && consult.patient !== null;
    const isGuest = consult.patient?.readableId === 'GUEST';

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-[#1e3a29]">{displayName}</h3>
                        {!isHistory && (
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold border flex items-center gap-1 ${fee > 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                <Stethoscope size={10} />
                                Consultation: {fee > 0 ? `₹${fee}` : "FREE"}
                            </span>
                        )}
                        {hasWallet && !isGuest && (
                            <button
                                onClick={() => openWalletModal(consult.patient)}
                                className={`text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1 hover:bg-purple-100 transition border ${walletBalance < 0 ? 'bg-red-50 text-red-700 border-red-200' : (walletBalance > 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-purple-50 text-purple-700 border-purple-200')}`}
                                title="Manage Wallet"
                            >
                                <Wallet size={12} />
                                {walletBalance < 0 ? `Due: ₹${Math.abs(walletBalance)}` : `Adv: ₹${walletBalance}`}
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Prescribed by {consult.doctorName} • {new Date(consult.createdAt).toLocaleDateString('en-GB')} at {new Date(consult.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                    <div className="flex gap-2 mt-2">
                        <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500 font-mono">PID: {displayId}</span>
                        {!isHistory && !isDirectSale && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-mono">APP: {consult.appointment?.readableId || "WALK-IN"}</span>}
                        {isDirectSale && <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold">DIRECT SALE</span>}
                    </div>
                </div>

                {!isHistory && (
                    <div className="flex flex-col items-end gap-2">
                        <div className="text-lg font-bold text-[#1e3a29] flex items-center gap-2 bg-green-50 px-3 py-1 rounded border border-green-100">
                            <Banknote size={18} className="text-green-600" />
                            Total: ₹{finalTotal.toFixed(0)}
                        </div>

                        <div className="flex gap-2 items-center">
                            <div className="flex items-center bg-gray-50 border rounded overflow-hidden">
                                <button onClick={() => toggleDiscountType(consult.id)} className="px-2 py-1 text-[10px] font-bold bg-gray-200 text-gray-600 hover:bg-gray-300 border-r" title="Click to switch between % and ₹">
                                    {discountType === 'PERCENT' ? '%' : '₹'}
                                </button>
                                <input type="number" placeholder={discountType === 'PERCENT' ? "Disc %" : "Disc ₹"} className="w-16 px-2 py-1 text-xs bg-transparent outline-none font-medium" value={discounts[consult.id] || ""} onChange={(e) => handleDiscountChange(consult.id, e.target.value)} />
                            </div>

                            <button onClick={handleShareBill} className="text-[#25D366] hover:bg-green-50 p-2 rounded-lg transition border border-transparent hover:border-green-200" title="Share Bill on WhatsApp">
                                <MessageCircle size={18} />
                            </button>

                            <button onClick={async () => { await persistFinancials(); printConsultationBill(consult); }} className="bg-blue-50 border border-blue-200 text-blue-700 font-bold px-3 py-2 rounded-lg text-xs hover:bg-blue-100 transition flex items-center gap-1"><FileText size={14} /> Consult</button>
                            <button onClick={async () => { await persistFinancials(); printPharmacyBill(consult, false); }} className="bg-white border border-[#1e3a29] text-[#1e3a29] font-bold px-3 py-2 rounded-lg text-xs hover:bg-gray-50 transition flex items-center gap-1"><FileText size={14} /> Meds</button>
                            <button onClick={async () => { await persistFinancials(); handleDispenseAll(items); }} className="bg-[#1e3a29] text-white font-bold px-4 py-2 rounded-lg text-xs shadow hover:bg-[#162b1e] transition flex items-center gap-2"><CheckCircle size={14} /> Dispense</button>
                        </div>
                    </div>
                )}

                {isHistory && (
                    <div className="flex flex-col items-end">
                        <div className="mt-2 text-sm font-bold text-[#1e3a29] flex items-center gap-2 mb-2">
                            <Banknote size={16} className="text-[#c5a059]" /> Total Bill: ₹{finalTotal.toFixed(0)}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleShareBill} className="text-[#25D366] hover:bg-green-50 p-2 rounded-lg transition border border-transparent hover:border-green-200" title="Share Bill on WhatsApp">
                                <MessageCircle size={18} />
                            </button>

                            <button onClick={() => handleReopen && handleReopen(consult.id)} className="bg-amber-50 border border-amber-200 text-amber-700 font-bold px-3 py-2 rounded-lg text-xs hover:bg-amber-100 flex items-center gap-1 transition"><RotateCcw size={14} /> Reopen</button>
                            <button onClick={() => printConsultationBill(consult)} className="bg-blue-50 border border-blue-200 text-blue-700 font-bold px-3 py-2 rounded-lg text-xs hover:bg-blue-100 flex items-center gap-1 transition"><Printer size={14} /> Consult</button>
                            <button onClick={() => printPharmacyBill(consult, true)} className="bg-gray-100 border border-gray-300 text-gray-700 font-bold px-3 py-2 rounded-lg text-xs hover:bg-gray-200 flex items-center gap-1 transition"><Printer size={14} /> Pharma</button>
                            <button onClick={() => handleDeleteHistoryRecord && handleDeleteHistoryRecord(consult.id, consult.patientId)} className="bg-red-50 border border-red-200 text-red-600 font-bold px-3 py-2 rounded-lg text-xs hover:bg-red-100 flex items-center gap-1 transition"><Trash2 size={14} /></button>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100 text-xs uppercase text-gray-500 text-left">
                        <tr>
                            <th className="p-3 w-1/4">Medicine</th>
                            <th className="p-3">Dosage / Info</th>
                            <th className="p-3">Duration</th>
                            <th className="p-3 text-center w-24">Qty Given</th>
                            <th className="p-3 text-right w-24">Cost (₹)</th>
                            <th className="p-3 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {items.map((item: any) => {
                            const currentQty = isHistory
                                ? (item.dispensedQty || 1)
                                : parseInt(dispenseQtys[item.id] || (item.dispensedQty ? item.dispensedQty.toString() : "1"));

                            const itemCost = (item.medicine?.price || 0) * currentQty;
                            return (
                                <tr key={item.id} className={item.status === 'DISPENSED' ? 'bg-green-50' : ''}>
                                    <td className="p-3">
                                        <div className="font-medium text-[#1e3a29]">{item.medicine?.name || "Unknown"}</div>
                                        <div className="flex gap-2 mt-1">
                                            <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded text-gray-600 font-bold">{item.unit || "Tablet"}</span>
                                            {item.panchkarma && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">{item.panchkarma}</span>}
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <div className="font-mono text-xs text-gray-800">{item.dosage}</div>
                                        <div className="text-[10px] text-gray-500">{item.instruction}</div>
                                    </td>
                                    <td className="p-3 font-bold text-gray-600">{item.duration}</td>
                                    <td className="p-3 text-center">
                                        {item.status === 'PENDING' ? (
                                            <input type="number" className="w-16 p-1 border border-gray-300 rounded text-center text-sm font-bold focus:border-[#c5a059] outline-none"
                                                value={dispenseQtys[item.id] || "1"}
                                                onChange={(e) => handleQtyChange(item.id, e.target.value)} min="1" />
                                        ) : (
                                            <span className="text-gray-600 font-bold bg-white border px-2 py-1 rounded">{item.dispensedQty || 1}</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-right font-bold text-gray-700">₹{itemCost}</td>
                                    <td className="p-3 text-right">
                                        {item.status === 'DISPENSED' ? (
                                            <span className="inline-flex items-center gap-1 text-green-700 font-bold text-xs bg-green-100 px-2 py-1 rounded-full"><CheckCircle size={12} /> Dispensed</span>
                                        ) : (
                                            <button onClick={() => handleDispenseItem(item.id)} className="inline-flex items-center gap-1 bg-[#c5a059] text-[#1e3a29] font-bold text-xs px-3 py-1.5 rounded hover:bg-[#b08d4b]">Dispense</button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

QueueItem.displayName = "QueueItem";
export default QueueItem;
