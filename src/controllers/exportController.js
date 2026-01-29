const PDFDocument = require("pdfkit");
const asyncHandler = require("../utils/asyncHandler");
const exportService = require("../services/exportService");

const formatDate = (date) =>
  date ? date.toISOString().split("T")[0] : "";

const exportCsv = asyncHandler(async (_req, res) => {
  const rows = await exportService.buildEmployeeSnapshot();
  const csv = exportService.buildCsv(rows);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=\"employees.csv\"");
  res.send(csv);
});

const exportPdf = asyncHandler(async (_req, res) => {
  const rows = await exportService.buildEmployeeSnapshot();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=\"employees.pdf\"");

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(res);

  doc.fontSize(14).text("Employee Transfer Report", { align: "center" });
  doc.moveDown(1.5);

  const columns = [
    { key: "empName", label: "Employee Name", width: 150 },
    { key: "empKgid", label: "Emp ID/KGID", width: 90 },
    { key: "fromCity", label: "From Location", width: 95 },
    { key: "toCity", label: "To Location", width: 95 },
    { key: "effectiveFrom", label: "Effective From", width: 85 },
  ];

  const startX = doc.page.margins.left;
  let y = doc.y;

  const drawHeader = () => {
    doc.font("Helvetica-Bold").fontSize(9);
    const headerRow = columns.reduce(
      (acc, column) => ({
        ...acc,
        [column.key]: column.label,
      }),
      {}
    );
    drawRow(headerRow, true);
  };

  const drawRow = (row, isHeader = false) => {
    doc.font(isHeader ? "Helvetica-Bold" : "Helvetica").fontSize(9);
    const rowHeights = columns.map((column) =>
      doc.heightOfString(row[column.key], {
        width: column.width - 8,
        align: "left",
      })
    );
    const rowHeight = Math.max(...rowHeights) + 8;

    if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      y = doc.page.margins.top;
      if (!isHeader) {
        drawHeader();
      }
    }

    let x = startX;
    columns.forEach((column) => {
      doc.rect(x, y, column.width, rowHeight).stroke();
      doc.text(row[column.key], x + 4, y + 4, {
        width: column.width - 8,
        align: "left",
      });
      x += column.width;
    });
    y += rowHeight;
  };

  drawHeader();

  rows.forEach((row) => {
    drawRow({
      empName: row.empName,
      empKgid: row.empKgid,
      fromCity: row.fromCity,
      toCity: row.toCity,
      effectiveFrom: formatDate(row.effectiveFrom),
    });
  });

  doc.end();
});

module.exports = { exportCsv, exportPdf };
