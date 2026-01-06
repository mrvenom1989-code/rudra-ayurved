import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import PharmacyClient from "./PharmacyClient";

export default function PharmacyPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-[#FDFBF7]"><Loader2 className="animate-spin text-[#c5a059]" size={48} /></div>}>
       <PharmacyClient />
    </Suspense>
  )
}