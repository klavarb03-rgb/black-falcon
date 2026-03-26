import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Response } from 'express';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InventoryRow {
  username: string;
  fullName: string | null;
  itemCount: number | string;
  totalQuantity: number | string;
  byStatus: { government: number | string; volunteer: number | string };
}

export interface OperationRow {
  id: string;
  type: string;
  quantityDelta: number;
  notes: string | null;
  createdAt: string;
  item: { id: string; name: string };
  fromUser: { id: string; username: string | null } | null;
  toUser: { id: string; username: string | null } | null;
  createdBy: { id: string; username: string };
}

export interface DonorRow {
  donorId: string | null;
  donorName: string;
  contactInfo: string | null;
  itemCount: number | string;
  totalQuantity: number | string;
}

// ─── Operation type translations ─────────────────────────────────────────────

const OPERATION_TYPE_UA: Record<string, string> = {
  transfer: 'Передача',
  write_off: 'Списання',
  receive: 'Отримання',
  adjustment: 'Коригування',
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' });
}

// ─── Excel helpers ────────────────────────────────────────────────────────────

function styleHeader(ws: ExcelJS.Worksheet, row: number, colCount: number): void {
  const headerRow = ws.getRow(row);
  for (let c = 1; c <= colCount; c++) {
    const cell = headerRow.getCell(c);
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  }
  headerRow.height = 24;
}

function styleDataRow(ws: ExcelJS.Worksheet, row: number, colCount: number, even: boolean): void {
  const r = ws.getRow(row);
  const bg = even ? 'FFDCE6F1' : 'FFFFFFFF';
  for (let c = 1; c <= colCount; c++) {
    const cell = r.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFB8CCE4' } },
      left: { style: 'thin', color: { argb: 'FFB8CCE4' } },
      bottom: { style: 'thin', color: { argb: 'FFB8CCE4' } },
      right: { style: 'thin', color: { argb: 'FFB8CCE4' } },
    };
  }
}

function addTitle(ws: ExcelJS.Worksheet, title: string, colCount: number): void {
  ws.mergeCells(1, 1, 1, colCount);
  const cell = ws.getCell('A1');
  cell.value = title;
  cell.font = { bold: true, size: 14, color: { argb: 'FF1F4E79' } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 30;
}

// ─── Inventory Excel ──────────────────────────────────────────────────────────

export async function exportInventoryExcel(data: InventoryRow[], res: Response): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Black Falcon';
  wb.created = new Date();

  const ws = wb.addWorksheet('Інвентаризація');

  const COLS = 6;
  addTitle(ws, 'Звіт: Інвентаризація', COLS);

  ws.getRow(2).values = [
    'Користувач',
    "Повне ім'я",
    'К-сть позицій',
    'Заг. кількість',
    'Державні',
    'Волонтерські',
  ];
  styleHeader(ws, 2, COLS);

  ws.columns = [
    { key: 'username', width: 22 },
    { key: 'fullName', width: 28 },
    { key: 'itemCount', width: 16 },
    { key: 'totalQuantity', width: 18 },
    { key: 'government', width: 16 },
    { key: 'volunteer', width: 18 },
  ];

  data.forEach((row, i) => {
    const r = ws.addRow([
      row.username,
      row.fullName ?? '',
      row.itemCount,
      row.totalQuantity,
      row.byStatus.government,
      row.byStatus.volunteer,
    ]);
    styleDataRow(ws, r.number, COLS, i % 2 === 0);
    r.getCell(3).alignment = { horizontal: 'center' };
    r.getCell(4).alignment = { horizontal: 'center' };
    r.getCell(5).alignment = { horizontal: 'center' };
    r.getCell(6).alignment = { horizontal: 'center' };
  });

  // Totals row
  if (data.length > 0) {
    const startRow = 3;
    const endRow = 2 + data.length;
    const totalsRow = ws.addRow([
      'РАЗОМ',
      '',
      { formula: `SUM(C${startRow}:C${endRow})` },
      { formula: `SUM(D${startRow}:D${endRow})` },
      { formula: `SUM(E${startRow}:E${endRow})` },
      { formula: `SUM(F${startRow}:F${endRow})` },
    ]);
    totalsRow.font = { bold: true };
    totalsRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="inventory.xlsx"');
  await wb.xlsx.write(res);
  res.end();
}

// ─── Operations Excel ─────────────────────────────────────────────────────────

export async function exportOperationsExcel(data: OperationRow[], res: Response): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Black Falcon';
  wb.created = new Date();

  const ws = wb.addWorksheet('Операції');
  const COLS = 8;

  addTitle(ws, 'Звіт: Журнал операцій', COLS);

  ws.getRow(2).values = ['Тип', 'Позиція', 'Кількість', 'Від кого', 'Кому', 'Ким створено', 'Примітки', 'Дата'];
  styleHeader(ws, 2, COLS);

  ws.columns = [
    { key: 'type', width: 16 },
    { key: 'item', width: 30 },
    { key: 'qty', width: 12 },
    { key: 'from', width: 20 },
    { key: 'to', width: 20 },
    { key: 'createdBy', width: 20 },
    { key: 'notes', width: 35 },
    { key: 'date', width: 22 },
  ];

  data.forEach((row, i) => {
    const r = ws.addRow([
      OPERATION_TYPE_UA[row.type] ?? row.type,
      row.item.name,
      row.quantityDelta,
      row.fromUser?.username ?? '',
      row.toUser?.username ?? '',
      row.createdBy.username,
      row.notes ?? '',
      fmtDate(row.createdAt),
    ]);
    styleDataRow(ws, r.number, COLS, i % 2 === 0);
    const qtyCell = r.getCell(3);
    qtyCell.alignment = { horizontal: 'center' };
    if (row.quantityDelta > 0) qtyCell.font = { color: { argb: 'FF375623' } };
    else if (row.quantityDelta < 0) qtyCell.font = { color: { argb: 'FF9C0006' } };
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="operations.xlsx"');
  await wb.xlsx.write(res);
  res.end();
}

// ─── Donor Excel ──────────────────────────────────────────────────────────────

export async function exportDonorExcel(data: DonorRow[], res: Response): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Black Falcon';
  wb.created = new Date();

  const ws = wb.addWorksheet('Донори');
  const COLS = 4;

  addTitle(ws, 'Звіт: Донори', COLS);

  ws.getRow(2).values = ['Донор', 'Контактна інформація', 'К-сть позицій', 'Заг. кількість'];
  styleHeader(ws, 2, COLS);

  ws.columns = [
    { key: 'name', width: 32 },
    { key: 'contact', width: 35 },
    { key: 'itemCount', width: 16 },
    { key: 'totalQuantity', width: 18 },
  ];

  data.forEach((row, i) => {
    const r = ws.addRow([
      row.donorName,
      row.contactInfo ?? '',
      row.itemCount,
      row.totalQuantity,
    ]);
    styleDataRow(ws, r.number, COLS, i % 2 === 0);
    r.getCell(3).alignment = { horizontal: 'center' };
    r.getCell(4).alignment = { horizontal: 'center' };
  });

  if (data.length > 0) {
    const startRow = 3;
    const endRow = 2 + data.length;
    const totalsRow = ws.addRow([
      'РАЗОМ',
      '',
      { formula: `SUM(C${startRow}:C${endRow})` },
      { formula: `SUM(D${startRow}:D${endRow})` },
    ]);
    totalsRow.font = { bold: true };
    totalsRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="donors.xlsx"');
  await wb.xlsx.write(res);
  res.end();
}

// ─── PDF helpers ──────────────────────────────────────────────────────────────

interface PdfColumn {
  label: string;
  width: number;
  align?: 'left' | 'center' | 'right';
}

const HEADER_BG = '#1F4E79';
const HEADER_FG = '#FFFFFF';
const ROW_EVEN_BG = '#DCE6F1';
const ROW_ODD_BG = '#FFFFFF';
const BORDER_COLOR = '#B8CCE4';
const TOTALS_BG = '#FFF2CC';
const ROW_HEIGHT = 18;
const HEADER_HEIGHT = 22;

function pdfTable(
  doc: PDFKit.PDFDocument,
  y: number,
  columns: PdfColumn[],
  rows: (string | number)[][],
  totalsRow?: (string | number)[],
): void {
  const tableLeft = doc.page.margins.left;
  const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const totalColWidth = columns.reduce((s, c) => s + c.width, 0);
  const scale = tableWidth / totalColWidth;
  const scaledCols = columns.map((c) => ({ ...c, width: c.width * scale }));

  // Header row
  let x = tableLeft;
  doc.save();
  for (const col of scaledCols) {
    doc.rect(x, y, col.width, HEADER_HEIGHT).fill(HEADER_BG);
    doc
      .fillColor(HEADER_FG)
      .fontSize(8)
      .font('Helvetica-Bold')
      .text(col.label, x + 3, y + 5, { width: col.width - 6, height: HEADER_HEIGHT, align: col.align ?? 'left' });
    x += col.width;
  }
  doc.restore();
  y += HEADER_HEIGHT;

  // Data rows
  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    const bg = ri % 2 === 0 ? ROW_EVEN_BG : ROW_ODD_BG;
    x = tableLeft;
    doc.save();
    for (let ci = 0; ci < scaledCols.length; ci++) {
      const col = scaledCols[ci];
      const val = row[ci] !== undefined && row[ci] !== null ? String(row[ci]) : '';
      doc.rect(x, y, col.width, ROW_HEIGHT).fill(bg);
      doc
        .fillColor('#000000')
        .fontSize(7.5)
        .font('Helvetica')
        .text(val, x + 3, y + 4, { width: col.width - 6, height: ROW_HEIGHT, align: col.align ?? 'left' });
      // border
      doc.rect(x, y, col.width, ROW_HEIGHT).stroke(BORDER_COLOR);
      x += col.width;
    }
    doc.restore();
    y += ROW_HEIGHT;

    // Page break
    if (y + ROW_HEIGHT > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      y = doc.page.margins.top;
    }
  }

  // Totals row
  if (totalsRow) {
    x = tableLeft;
    doc.save();
    for (let ci = 0; ci < scaledCols.length; ci++) {
      const col = scaledCols[ci];
      const val = totalsRow[ci] !== undefined && totalsRow[ci] !== null ? String(totalsRow[ci]) : '';
      doc.rect(x, y, col.width, ROW_HEIGHT).fill(TOTALS_BG);
      doc
        .fillColor('#000000')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text(val, x + 3, y + 4, { width: col.width - 6, height: ROW_HEIGHT, align: col.align ?? 'left' });
      doc.rect(x, y, col.width, ROW_HEIGHT).stroke(BORDER_COLOR);
      x += col.width;
    }
    doc.restore();
  }
}

function pdfTitle(doc: PDFKit.PDFDocument, title: string, subtitle?: string): number {
  doc.fontSize(16).font('Helvetica-Bold').fillColor(HEADER_BG).text(title, { align: 'center' });
  if (subtitle) {
    doc.fontSize(9).font('Helvetica').fillColor('#555555').text(subtitle, { align: 'center' });
  }
  doc.moveDown(0.5);
  return doc.y;
}

function pdfSend(doc: PDFKit.PDFDocument, filename: string, res: Response): void {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);
}

// ─── Inventory PDF ────────────────────────────────────────────────────────────

export function exportInventoryPdf(data: InventoryRow[], res: Response): void {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
  pdfSend(doc, 'inventory.pdf', res);

  const now = new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' });
  const y = pdfTitle(doc, 'Звіт: Інвентаризація', `Сформовано: ${now}`);

  const columns: PdfColumn[] = [
    { label: 'Користувач', width: 90 },
    { label: "Повне ім'я", width: 120 },
    { label: 'К-сть позицій', width: 70, align: 'center' },
    { label: 'Заг. кількість', width: 80, align: 'center' },
    { label: 'Державні', width: 70, align: 'center' },
    { label: 'Волонтерські', width: 80, align: 'center' },
  ];

  const rows = data.map((r) => [
    r.username,
    r.fullName ?? '',
    r.itemCount,
    r.totalQuantity,
    r.byStatus.government,
    r.byStatus.volunteer,
  ]);

  const totals = data.reduce(
    (acc, r) => {
      acc[2] = Number(acc[2]) + Number(r.itemCount);
      acc[3] = Number(acc[3]) + Number(r.totalQuantity);
      acc[4] = Number(acc[4]) + Number(r.byStatus.government);
      acc[5] = Number(acc[5]) + Number(r.byStatus.volunteer);
      return acc;
    },
    ['РАЗОМ', '', 0, 0, 0, 0] as (string | number)[],
  );

  pdfTable(doc, y, columns, rows, data.length > 0 ? totals : undefined);
  doc.end();
}

// ─── Operations PDF ───────────────────────────────────────────────────────────

export function exportOperationsPdf(data: OperationRow[], res: Response): void {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
  pdfSend(doc, 'operations.pdf', res);

  const now = new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' });
  const y = pdfTitle(doc, 'Звіт: Журнал операцій', `Сформовано: ${now}`);

  const columns: PdfColumn[] = [
    { label: 'Тип', width: 60 },
    { label: 'Позиція', width: 110 },
    { label: 'Кількість', width: 55, align: 'center' },
    { label: 'Від кого', width: 80 },
    { label: 'Кому', width: 80 },
    { label: 'Ким створено', width: 80 },
    { label: 'Примітки', width: 100 },
    { label: 'Дата', width: 100 },
  ];

  const rows = data.map((r) => [
    OPERATION_TYPE_UA[r.type] ?? r.type,
    r.item.name,
    r.quantityDelta,
    r.fromUser?.username ?? '',
    r.toUser?.username ?? '',
    r.createdBy.username,
    r.notes ?? '',
    fmtDate(r.createdAt),
  ]);

  pdfTable(doc, y, columns, rows);
  doc.end();
}

// ─── Donor PDF ────────────────────────────────────────────────────────────────

export function exportDonorPdf(data: DonorRow[], res: Response): void {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  pdfSend(doc, 'donors.pdf', res);

  const now = new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' });
  const y = pdfTitle(doc, 'Звіт: Донори', `Сформовано: ${now}`);

  const columns: PdfColumn[] = [
    { label: 'Донор', width: 130 },
    { label: 'Контактна інформація', width: 160 },
    { label: 'К-сть позицій', width: 80, align: 'center' },
    { label: 'Заг. кількість', width: 80, align: 'center' },
  ];

  const rows = data.map((r) => [r.donorName, r.contactInfo ?? '', r.itemCount, r.totalQuantity]);

  const totals = data.reduce(
    (acc, r) => {
      acc[2] = Number(acc[2]) + Number(r.itemCount);
      acc[3] = Number(acc[3]) + Number(r.totalQuantity);
      return acc;
    },
    ['РАЗОМ', '', 0, 0] as (string | number)[],
  );

  pdfTable(doc, y, columns, rows, data.length > 0 ? totals : undefined);
  doc.end();
}
