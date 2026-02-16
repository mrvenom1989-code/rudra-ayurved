import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface BillItem {
  name: string;
  qty: string | number;
  amount: number;
  dosage?: string; // This will now contain "Dosage + Info"
}

interface BillData {
  billNo: string;
  date: string;
  patientName: string;
  patientId: string;
  appointmentId: string;
  doctorName: string;
  items: BillItem[];
}

interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: {
    finalY?: number;
  };
}

// Helper to load image for PDF
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = reject;
  });
};

export const generateBill = async (data: BillData) => {
  const doc: jsPDFWithAutoTable = new jsPDF();

  // --- 1. HEADER ---

  // A. Logo (Top Left)
  try {
    const logo = await loadImage("/rudralogo.png");
    // Add image: x, y, width, height
    doc.addImage(logo, "PNG", 10, 10, 25, 25);
  } catch {
    console.warn("Logo not found");
  }

  // B. Title & Subtitle (Center)
  doc.setFontSize(24);
  doc.setTextColor(176, 155, 92); // Gold (#B09B5C)
  doc.setFont("times", "bold");
  doc.text("RUDRA AYURVED", 105, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(30, 58, 41); // Dark Green (#1e3a29)
  doc.setFont("helvetica", "bold");
  doc.text("Multi - Speciality Panchkarma Hospital", 105, 26, { align: "center" });

  // C. Slogan (Top Right)
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  doc.text('"Ayurveda: Shashwato Swasthya"', 105, 32, { align: "center" });

  // Divider Line
  doc.setDrawColor(176, 155, 92);
  doc.setLineWidth(0.5);
  doc.line(10, 38, 200, 38);

  // --- 2. PATIENT DETAILS ---
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  // Left Side
  doc.text(`Bill No: ${data.billNo}`, 14, 48);
  doc.text(`Appt ID: ${data.appointmentId || '-'}`, 14, 54);

  // Right Side
  doc.text(`Date: ${data.date}`, 150, 48);
  doc.text(`Patient ID: ${data.patientId || '-'}`, 150, 54);

  // Patient Name
  doc.text("To:", 14, 65);
  doc.setFont("helvetica", "bold");
  doc.text(data.patientName, 22, 65);
  doc.setFont("helvetica", "normal");

  // --- 3. ITEMS TABLE ---
  
  const tableBody = data.items.map((item, index) => [
    index + 1,
    item.name,
    item.dosage || "-", 
    item.qty,
    `Rs. ${item.amount}`
  ]);

  // Total Row
  const total = data.items.reduce((sum, item) => sum + item.amount, 0);
  tableBody.push(["", "TOTAL", "", "", `Rs. ${total}`]);

  autoTable(doc, {
    startY: 70,
    // ✅ Updated Header to match Pharmacy UI
    head: [['NO', 'PRODUCT', 'DOSAGE / INFO', 'QTY', 'AMOUNT']], 
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 41], textColor: 255 }, // Dark Green
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' }, // No
      1: { cellWidth: 'auto' },               // Product
      // ✅ Decreased font size for Dosage column to fit content better
      2: { cellWidth: 45, halign: 'center', fontSize: 8 }, 
      3: { cellWidth: 20, halign: 'center' }, // Qty
      4: { cellWidth: 30, halign: 'right' }   // Amount
    }
  });

  // --- 4. FOOTER & SIGNATURE ---
  let finalY = doc.lastAutoTable?.finalY || 80;

  // Page Break Check
  if (finalY > 220) {
    doc.addPage();
    finalY = 20;
  }

  // A. Signature Block (Right Aligned)
  const signatureY = finalY + 20;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("For Rudra Ayurved", 150, signatureY);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("(Authorized Signatory)", 150, signatureY + 5);

  // B. Footer Address Block (Bottom Center)
  const pageHeight = doc.internal.pageSize.height;

  // Appointment Number (Larger)
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 41); // Dark Green
  doc.text("For Appointment: +91-6352135799", 105, pageHeight - 22, { align: "center" });

  // Address
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text("206, B- Block, 2nd Floor, Olive Greens, Gota, S.G. Highway, Ahmedabad - 382481", 105, pageHeight - 15, { align: "center" });
  doc.text("www.rudraayurved.com  |  rudraayurved5@gmail.com", 105, pageHeight - 10, { align: "center" });

  // Save
  doc.save(`Bill_${data.patientName}_${data.billNo}.pdf`);
};