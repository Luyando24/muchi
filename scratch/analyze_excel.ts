import * as XLSX from 'xlsx';
import * as fs from 'fs';

const filePath = '2026 End of Term One test analysis.xlsx';

function analyze() {
  const buf = fs.readFileSync(filePath);
  const workbook = XLSX.read(buf, {type: 'buffer', cellFormula: true});
  const sheetName = 'GRADE 12';
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) return;

  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log('--- GRADE BOUNDARIES (Rows 27 onwards) ---');
  for (let i = 27; i < 40; i++) {
    const row = rawData[i] as any[];
    if (row && row[1] && row[2]) {
       console.log(`${row[2]} (${row[1]})`);
    }
  }
}

analyze();
