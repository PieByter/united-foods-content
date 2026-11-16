import fs from "node:fs";
import path from "node:path";

/**
 * Muat .env.local lalu .env tanpa dependensi tambahan.
 * Variabel yang sudah ada di process.env tidak ditimpa.
 */
export function loadEnvFiles(cwd = process.cwd()): void {
  for (const file of [".env.local", ".env"]) {
    const full = path.join(cwd, file);
    if (!fs.existsSync(full)) continue;
    const content = fs.readFileSync(full, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}
