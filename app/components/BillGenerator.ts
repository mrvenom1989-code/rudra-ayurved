import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface BillItem {
  name: string;
  qty: string | number;
  amount: number;
}

interface BillData {
  billNo: string;
  date: string;
  patientName: string;
  patientId: string;      // 👈 Added Readable Patient ID
  appointmentId: string;  // 👈 Added Readable Appt ID
  doctorName: string;     // 👈 Added Doctor Name
  items: BillItem[];
}

export const generateBill = (data: BillData) => {
  const doc = new jsPDF();

  // --- 1. HEADER LOGO & TITLE ---
  doc.setFontSize(24);
  doc.setTextColor(176, 155, 92); // Gold (#B09B5C)
  doc.setFont("times", "bold");
  doc.text("RUDRA AYURVED", 105, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(30, 58, 41); // Dark Green (#1e3a29)
  doc.setFont("helvetica", "bold");
  doc.text("Multi - Speciality Panchkarma Hospital", 105, 26, { align: "center" });

  // Slogan
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100); 
  doc.text('"Ayurveda: Shashwato Swasthya"', 105, 32, { align: "center" });

  // Contact Info (Top Right)
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text("For Appointment: +91-6352135799", 195, 10, { align: "right" });

  // Divider Line
  doc.setDrawColor(176, 155, 92);
  doc.setLineWidth(0.5);
  doc.line(10, 36, 200, 36);

  // --- 2. BILL & PATIENT DETAILS ---
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  // Left Side: Bill Info
  doc.text(`Bill No: ${data.billNo}`, 14, 45);
  doc.text(`Appt ID: ${data.appointmentId || '-'}`, 14, 51); // 👈 Added Appt ID

  // Right Side: Date & Patient ID
  doc.text(`Date: ${data.date}`, 150, 45);
  doc.text(`Patient ID: ${data.patientId || '-'}`, 150, 51); // 👈 Added Patient ID

  // Patient Name Section
  doc.text("To:", 14, 62);
  doc.setFont("helvetica", "bold");
  doc.text(data.patientName, 22, 62);
  doc.setFont("helvetica", "normal");

  // --- 3. ITEMS TABLE ---
  const tableBody = data.items.map((item, index) => [
    index + 1,
    item.name,
    item.qty,
    `Rs. ${item.amount}`
  ]);

  // Calculate Total
  const total = data.items.reduce((sum, item) => sum + item.amount, 0);
  tableBody.push(["", "TOTAL", "", `Rs. ${total}`]);

  autoTable(doc, {
    startY: 68,
    head: [['NO', 'PRODUCT', 'QTY', 'AMOUNT']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 41], textColor: 255 }, // Dark Green
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' }
    }
  });

  // --- 4. FOOTER & SIGNATURE ---
  // @ts-ignore
  let finalY = (doc as any).lastAutoTable?.finalY || 80;
  
  // Ensure we don't go off page
  if (finalY > 240) {
    doc.addPage();
    finalY = 20;
  }

  // Signature Block (Right Aligned)
  const signatureY = finalY + 20;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("For Rudra Ayurved", 150, signatureY);
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 41); // Dark Green for Doctor Name
  doc.text(`Dr. ${data.doctorName || 'Chirag Raval'}`, 150, signatureY + 10); // 👈 Dynamic Doctor Name

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("(Authorized Signatory)", 150, signatureY + 14);

  // Footer Address (Bottom Center)
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  const pageHeight = doc.internal.pageSize.height;
  
  doc.text("206, B- Block, 2nd Floor, Olive Greens, Gota, S.G. Highway, Ahmedabad - 382481", 105, pageHeight - 15, { align: "center" });
  doc.text("www.rudraayurved.com  |  rudraayurved5@gmail.com", 105, pageHeight - 10, { align: "center" });

  // Save File
  doc.save(`Bill_${data.patientName}_${data.billNo}.pdf`);
};