// ✅ HELPER: Sanitize Name
export const cleanName = (name: string) => {
    if (!name) return "Unknown";
    return name.replace(/[0-9]/g, '').trim();
};

// ✅ HELPER: Smartly Resolve Patient Name (Handles Guest Names stored in Diagnosis)
export const getPatientDisplayName = (consult: any) => {
    if (consult.patient?.readableId === 'GUEST') {
        if (consult.diagnosis && consult.diagnosis.startsWith("Guest:")) {
            return consult.diagnosis.replace("Guest:", "").trim();
        }
        return "Guest";
    }
    return cleanName(consult.patient?.name || consult.patientName || consult.name || "Unknown");
};
