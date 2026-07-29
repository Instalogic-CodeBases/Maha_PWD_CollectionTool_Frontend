import ExcelJS from 'exceljs';
import { DISTRICT_EN } from './seed.js';
import { resolveDistrict } from './helpers.js';

// ===================== EXCEL TEMPLATE (प्रपत्र-ब) =====================
// Verbatim port of the prototype's downloadExcelTemplate(). `uDistList` is the
// caller's districtsForUser(currentUser) list.
export async function downloadExcelTemplate(fields, computerIds, uDistList) {
  const wb = new ExcelJS.Workbook();
  wb.calcProperties.fullCalcOnLoad = true; // force recompute of Scheme Name on open
  const ws = wb.addWorksheet('प्रपत्र-ब');
  ws.mergeCells('A1:Q1'); ws.getCell('A1').value = 'प्रपत्र-ब'; ws.getCell('A1').alignment = { horizontal: 'center' }; ws.getCell('A1').font = { bold: true, size: 12 };
  ws.mergeCells('A2:Q2'); ws.getCell('A2').value = 'आर्थिक वर्ष 2026-27'; ws.getCell('A2').alignment = { horizontal: 'center' }; ws.getCell('A2').font = { bold: true };
  ws.mergeCells('A3:Q3'); ws.getCell('A3').value = 'कामनिहाय योजनांतर्गत प्रलंबित देयकांची माहिती'; ws.getCell('A3').alignment = { horizontal: 'center' }; ws.getCell('A3').font = { bold: true };
  // header row
  const headerRow = 5;
  const headers = ['अ.क्र.'].concat(fields.map((f) => f.marathi));
  headers.forEach((h, i) => {
    const cell = ws.getCell(headerRow, i + 1);
    cell.value = h; cell.font = { bold: true }; cell.alignment = { horizontal: 'center', wrapText: true };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    const isMand = i === 0 ? true : fields[i - 1].mandatory;
    if (isMand) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF59D' } };
  });
  // numbering row
  const numRow = headerRow + 1;
  headers.forEach((_, i) => { ws.getCell(numRow, i + 1).value = i + 1; ws.getCell(numRow, i + 1).alignment = { horizontal: 'center' }; ws.getCell(numRow, i + 1).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }; });
  const cidColIdx = fields.findIndex((f) => f.type === 'computerId');
  const schemeColIdx = fields.findIndex((f) => f.type === 'scheme');
  const distColIdx = fields.findIndex((f) => f.type === 'district');
  const cidCol = cidColIdx >= 0 ? cidColIdx + 2 : -1;
  const schemeCol = schemeColIdx >= 0 ? schemeColIdx + 2 : -1;
  const distCol = distColIdx >= 0 ? distColIdx + 2 : -1;
  const startRow = numRow + 1;
  const totalRows = Math.max(computerIds.length, 30);
  const cidList = '"' + computerIds.map((c) => c.computerId).join(',') + '"';
  const distBilingual = [];
  uDistList.forEach((d) => {
    if (d && distBilingual.indexOf(d) === -1) distBilingual.push(d);
    const en = DISTRICT_EN[d] || DISTRICT_EN[resolveDistrict(d)];
    if (en && distBilingual.indexOf(en) === -1) distBilingual.push(en);
  });
  const distList = '"' + distBilingual.join(',') + '"';
  function schemeFormula(cidCellRef) {
    let f = '""';
    for (let i = computerIds.length - 1; i >= 0; i--) {
      f = `IF((${cidCellRef}&"")="${computerIds[i].computerId}","${computerIds[i].schemeName}",${f})`;
    }
    return `=${f}`;
  }
  for (let idx = 0; idx < totalRows; idx++) {
    const r = startRow + idx;
    ws.getCell(r, 1).value = idx + 1;
    if (distCol > 0) {
      const dCell = ws.getCell(r, distCol);
      dCell.dataValidation = { type: 'list', allowBlank: true, formulae: [distList], showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Invalid District', error: 'Please select one of your assigned districts from the dropdown.' };
    }
    if (cidCol > 0) {
      const cCell = ws.getCell(r, cidCol);
      cCell.numFmt = '@';
      cCell.dataValidation = { type: 'list', allowBlank: true, formulae: [cidList], showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Invalid Computer ID', error: 'Please select a Computer ID from the dropdown.' };
    }
    if (schemeCol > 0) {
      const sCell = ws.getCell(r, schemeCol);
      const cidRef = ws.getCell(r, cidCol).address;
      sCell.value = { formula: schemeFormula(cidRef).slice(1) };
      sCell.font = { italic: true, color: { argb: 'FF6B7C8F' } };
      sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F7FD' } };
    }
    for (let ci = 1; ci <= headers.length; ci++) { ws.getCell(r, ci).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }; }
  }
  const footRow = startRow + totalRows + 2;
  ws.getCell(footRow, 1).value = 'टिप :- प्रत्येक कामाची भौतिक प्रगतीची टक्केवारी नमूद करणे अनिवार्य आहे. जिल्हा व संगणक संकेतांक ड्रॉपडाऊन मधूनच निवडा.';
  ws.getCell(footRow, 1).font = { italic: true };
  headers.forEach((_, i) => { ws.getColumn(i + 1).width = i === 0 ? 7 : 22; });
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'प्रपत्र-ब_Template.xlsx'; a.click();
}

// ===================== VIEW SUBMITTED DATA -> EXCEL =====================
// Headers are in Marathi to match the on-screen grid. Column order ends with
// the सादरकर्ता / दिनांक / वेळ (Submitted By / Date / Time) trio.
const timeOf = (s) => s.time || (s.data && s.data.__time) || '';
export async function downloadViewExcel(list, cols) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Submissions');
  const headers = ['मंडळ', 'जिल्हा']
    .concat(cols.map((f) => f.marathi))
    .concat(['सादरकर्ता', 'दिनांक', 'वेळ']);
  ws.addRow(headers).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9F3EE' } };
  list.forEach((s) => {
    ws.addRow([
      s.circle, s.district,
      ...cols.map((f) => s.data[f.key] || ''),
      s.submittedBy || '', s.date || '', timeOf(s) || '',
    ]);
  });
  ws.columns.forEach((c) => (c.width = 20));
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf]); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Submissions.xlsx'; a.click();
}

// ===================== REPORT -> EXCEL =====================
export async function downloadReportExcel(list, cols) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Report');
  const headers = ['Date', 'Circle', 'District'].concat(cols.map((f) => f.marathi));
  ws.addRow(headers).font = { bold: true };
  list.forEach((s) => { ws.addRow([s.date, s.circle, s.district, ...cols.map((f) => s.data[f.key] || '')]); });
  ws.columns.forEach((c) => (c.width = 20));
  const buf = await wb.xlsx.writeBuffer();
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buf])); a.download = 'Report.xlsx'; a.click();
}