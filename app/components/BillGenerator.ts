// app/components/BillGenerator.ts
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
  items: BillItem[];
}

export const generateBill = (data: BillData) => {
  const doc = new jsPDF();

  // --- 1. HEADER ---
  // Hospital Name
  doc.setFontSize(24);
  doc.setTextColor(176, 155, 92); // Gold (#B09B5C)
  doc.setFont("times", "bold");
  doc.text("RUDRA AYURVED", 105, 20, { align: "center" });

  // Subtitle
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 41); // Dark Green (#1e3a29)
  doc.setFont("helvetica", "bold");
  doc.text("Multi - Speciality Panchkarma Hospital", 105, 26, { align: "center" });

  // Slogan (Fixed: Converted to English to prevent PDF errors)
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100); 
  doc.text('"Ayurveda: Shashwato Swasthya"', 105, 32, { align: "center" });

  // Contact Info
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text("For Appointment: +91-6352135799", 195, 10, { align: "right" });

  // Divider Line
  doc.setDrawColor(176, 155, 92);
  doc.setLineWidth(0.5);
  doc.line(10, 36, 200, 36);

  // --- 2. BILL DETAILS ---
  doc.setFontSize(10);
  doc.text(`Bill No: ${data.billNo}`, 14, 45);
  doc.text(`Date: ${data.date}`, 150, 45);
  
  doc.text("To:", 14, 52);
  doc.setFont("helvetica", "bold");
  doc.text(data.patientName, 22, 52);

  // --- 3. TABLE ---
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
    startY: 60,
    head: [['NO', 'PRODUCT', 'QTY', 'AMOUNT']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 41], textColor: 255 }, // Dark Green Header
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' }
    }
  });

  // --- 4. FOOTER ---
  // @ts-ignore
  const finalY = (doc as any).lastAutoTable?.finalY || 80;
  
  doc.setFontSize(9);
  doc.setTextColor(0,0,0);
  
  // Footer Address
  doc.text("206, B- Block, 2nd Floor, Olive Greens, Gota, S.G. Highway, Ahmedabad - 382481", 105, 280, { align: "center" });
  doc.text("www.rudraayurved.com  |  rudraayurved5@gmail.com", 105, 285, { align: "center" });

  // Save File
  doc.save(`Bill_${data.patientName}_${data.billNo}.pdf`);
};