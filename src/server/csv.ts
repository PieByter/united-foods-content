/** Parser CSV kecil tanpa dependensi: mendukung kutip, escape "", dan delimiter , atau ; */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.includes(";") && !firstLine.includes(",") ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  const pushField = () => {
    row.push(field.trim());
    field = "";
  };
  const pushRow = () => {
    if (row.length > 0 && row.some((value) => value !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i];
    if (quoted) {
      if (char === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      pushField();
    } else if (char === "\n") {
      pushField();
      pushRow();
    } else if (char === "\r") {
      // skip
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }
  return rows;
}

export function toCsv(rows: Array<Record<string, string | number | null | undefined>>, columns?: string[]): string {
  if (rows.length === 0) return columns ? `${columns.join(",")}\n` : "";
  const keys = columns ?? Object.keys(rows[0]);
  const escape = (value: string | number | null | undefined) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [keys.join(","), ...rows.map((row) => keys.map((key) => escape(row[key])).join(","))].join("\n");
}

export function parseConversionsCell(cell: string): Array<{ fromUnit: string; toUnit: string; factor: string }> {
  if (!cell.trim()) return [];
  return cell
    .split(/[;|]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const match = entry.match(/^1\s+(.+?)\s*=\s*([\d.,]+)\s+(.+)$/i);
      if (!match) return null;
      let factor = match[2].trim();
      if (factor.includes(",")) {
        factor = factor.replace(/\./g, "").replace(",", ".");
      } else if (/^\d{1,3}(\.\d{3})+$/.test(factor)) {
        factor = factor.replace(/\./g, "");
      }
      return {
        fromUnit: match[1].trim(),
        toUnit: match[3].trim(),
        factor,
      };
    })
    .filter((entry): entry is { fromUnit: string; toUnit: string; factor: string } => entry !== null);
}
