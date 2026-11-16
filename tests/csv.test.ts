import { describe, expect, it } from "vitest";
import { parseConversionsCell, parseCsv, toCsv } from "@/server/csv";
import { normalizeDecimalInput, parseDecimalInput } from "@/lib/format";

describe("CSV import/export", () => {
  it("mem-parsing kutip, delimiter koma, dan baris kosong", () => {
    const rows = parseCsv(
      'name,sku,category,price,notes\n"Tepung, Cakra",FLR-001,"Tepung & Pati",12000,"Kemasan 1 kg"\n\nTelur,EGG-001,Dairy & Telur,2000,\n',
    );
    expect(rows).toHaveLength(3);
    expect(rows[1]).toEqual(["Tepung, Cakra", "FLR-001", "Tepung & Pati", "12000", "Kemasan 1 kg"]);
    expect(rows[2][0]).toBe("Telur");
  });

  it("mendeteksi delimiter titik koma", () => {
    const rows = parseCsv("name;sku;price\nGula;SGR-001;18000");
    expect(rows[1]).toEqual(["Gula", "SGR-001", "18000"]);
  });

  it("meng-escape CSV saat export", () => {
    const csv = toCsv([{ name: 'Butter "AOP"', note: "satu, dua" }]);
    expect(csv).toContain('"Butter ""AOP"""');
    expect(csv).toContain('"satu, dua"');
  });

  it("membaca konversi 1 butir = 55 gr dan 1 sdm = 14,2 gr", () => {
    const conversions = parseConversionsCell("1 butir = 55 gr; 1 sdm = 14,2 gr");
    expect(conversions).toEqual([
      { fromUnit: "butir", toUnit: "gr", factor: "55" },
      { fromUnit: "sdm", toUnit: "gr", factor: "14.2" },
    ]);
  });
});

describe("input numerik lokal", () => {
  it("menerima format ribuan Indonesia dan desimal koma", () => {
    expect(parseDecimalInput("12.000")).toBe("12000");
    expect(parseDecimalInput("14,2")).toBe("14.2");
    expect(parseDecimalInput("Rp 2.500")).toBe("2500");
  });

  it("merapikan numeric database untuk input", () => {
    expect(normalizeDecimalInput("8.000000")).toBe("8");
    expect(normalizeDecimalInput("2.500000")).toBe("2.5");
    expect(normalizeDecimalInput(null, "")).toBe("");
  });
});
