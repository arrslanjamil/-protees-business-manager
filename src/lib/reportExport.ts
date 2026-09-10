/** Shared PDF/Excel export helpers for the Reports page — one code path
 * for every report so each new report type only needs to supply its own
 * head/rows/footer, not reimplement jsPDF/xlsx wiring. */

export async function exportReportPdf(params: {
  title: string
  subtitle?: string
  head: string[]
  rows: (string | number)[][]
  footer?: (string | number)[]
  filename: string
}) {
  const { title, subtitle, head, rows, footer, filename } = params
  const [{ default: jsPDF }, autoTableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const autoTable = autoTableModule.default
  const doc = new jsPDF()
  doc.setFontSize(14)
  doc.text(title, 14, 16)
  if (subtitle) {
    doc.setFontSize(10)
    doc.text(subtitle, 14, 23)
  }
  autoTable(doc, {
    startY: subtitle ? 28 : 22,
    head: [head],
    body: rows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [34, 211, 238] },
    foot: footer ? [footer] : undefined,
  })
  doc.save(filename)
}

export async function exportReportExcel(params: { rows: Record<string, unknown>[]; sheetName: string; filename: string }) {
  const { rows, sheetName, filename } = params
  const XLSX = await import('xlsx')
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, filename)
}
