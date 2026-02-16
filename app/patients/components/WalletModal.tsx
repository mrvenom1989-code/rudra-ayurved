"use client";

import { Wallet } from "lucide-react";

interface WalletModalProps {
    showWalletModal: boolean;
    setShowWalletModal: (show: boolean) => void;
    walletType: "CREDIT" | "DUE";
    setWalletType: (type: "CREDIT" | "DUE") => void;
    walletAmount: string;
    setWalletAmount: (amount: string) => void;
    handleWalletUpdate: () => void;
    patientName: string;
}

export default function WalletModal({
    showWalletModal, setShowWalletModal,
    walletType, setWalletType,
    walletAmount, setWalletAmount,
    handleWalletUpdate, patientName
}: WalletModalProps) {
    if (!showWalletModal) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95">
                <h3 className="text-lg font-bold text-[#1e3a29] mb-4 flex items-center gap-2"><Wallet /> Manage Wallet</h3>
                <p className="text-sm text-gray-500 mb-4">Managing balance for <span className="font-bold text-black">{patientName}</span></p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Transaction Type</label>
                        <select
                            className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-[#c5a059]"
                            value={walletType}
                            onChange={(e) => setWalletType(e.target.value as "CREDIT" | "DUE")}
                        >
                            <option value="CREDIT">Credit (Deposit / Advance)</option>
                            <option value="DUE">Due (Charge / Debt)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Amount (₹)</label>
                        <input
                            type="number"
                            autoFocus
                            placeholder="Enter Amount"
                            className="w-full p-3 border rounded-lg text-lg font-bold outline-none focus:ring-2 focus:ring-[#c5a059]"
                            value={walletAmount}
                            onChange={(e) => setWalletAmount(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button onClick={() => setShowWalletModal(false)} className="flex-1 py-2 text-gray-600 font-bold bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                    <button
                        onClick={handleWalletUpdate}
                        className={`flex-1 py-2 text-white font-bold rounded-lg transition ${walletType === 'CREDIT' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                    >
                        {walletType === 'CREDIT' ? 'Add Credit' : 'Add Due'}
                    </button>
                </div>
            </div>
        </div>
    );
}
