type Cell = string | number | null | undefined;

// Quotes a cell for CSV. A leading = + - @ is defused so Excel or Sheets
// never runs text someone typed into a public form as a formula.
function cell(value: Cell) {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// A CSV download that opens correctly in Excel (the BOM tells it UTF-8, so
// ₹ and Hindi names survive) as well as Google Sheets and Numbers.
export function csvResponse(filename: string, header: string[], rows: Cell[][]) {
  const body = [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
  return new Response(`﻿${body}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
