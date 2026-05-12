import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], fileName: string) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

export const exportToPDF = (title: string, headers: string[], rows: any[][], fileName: string) => {
  const doc = new jsPDF();
  
  // Add Title
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  // Add Date
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
  
  // Add Table
  (doc as any).autoTable({
    head: [headers],
    body: rows,
    startY: 40,
    theme: 'striped',
    headStyles: { fillStyle: [59, 130, 246] }
  });
  
  doc.save(`${fileName}.pdf`);
};

export const generateNationalReport = async (stats: any) => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text('National Education Analytics Report', 14, 20);
    
    doc.setFontSize(12);
    doc.text(`Total Schools: ${stats.totalSchools}`, 14, 35);
    doc.text(`Total Students: ${stats.totalStudents}`, 14, 45);
    doc.text(`National Pass Rate: ${stats.nationalPassRate}%`, 14, 55);
    doc.text(`YoY Change: ${stats.yoyPassRate?.change}%`, 14, 65);
    
    doc.save('National_Education_Report.pdf');
};
