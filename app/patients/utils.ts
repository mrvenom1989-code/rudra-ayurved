// ✅ HELPER: Sanitize Name
export const cleanName = (name: string) => {
    if (!name) return "Unknown";
    return name.replace(/[0-9]/g, '').trim();
};
