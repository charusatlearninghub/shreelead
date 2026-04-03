import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { buildLeadInsertPayload, parseLeadsFromFile } from "@/lib/leadUpload";

const createXlsxFile = (rows: Array<Array<string | number>>, fileName: string) => {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, "Leads");
  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return new File([buffer], fileName, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
};

describe("lead upload parsing", () => {
  it("parses CSV with accepted columns", async () => {
    const csv = [
      "full_name,phone_number,city,state,gender,language",
      "Alice,9876543210,Ahmedabad,Gujarat,Female,Gujarati",
      "Bob,9876500000,Surat,Gujarat,Male,Hindi",
    ].join("\n");

    const file = new File([csv], "leads.csv", { type: "text/csv" });
    const result = await parseLeadsFromFile(file);

    expect(result.missingColumns).toEqual([]);
    expect(result.fileType).toBe("csv");
    expect(result.detectedColumns).toEqual(["full_name", "phone_number", "city", "state", "gender", "language"]);
    expect(result.leads).toHaveLength(2);
    expect(result.leads[0]).toEqual({
      full_name: "Alice",
      phone_number: "9876543210",
      city: "Ahmedabad",
      state: "Gujarat",
      gender: "female",
      language: "gujarati",
    });
  });

  it("parses XLSX with accepted columns", async () => {
    const file = createXlsxFile(
      [
        ["full_name", "phone_number", "city", "state", "gender", "language"],
        ["Charlie", "9999999999", "Vadodara", "Gujarat", "Mix", "Mix"],
      ],
      "leads.xlsx",
    );

    const result = await parseLeadsFromFile(file);
    expect(result.missingColumns).toEqual([]);
    expect(result.fileType).toBe("xlsx");
    expect(result.leads).toHaveLength(1);
    expect(result.leads[0].full_name).toBe("Charlie");
  });

  it("fills defaults when optional columns are missing", async () => {
    const csv = [
      "full_name,phone_number",
      "Dipa,9090909090",
    ].join("\n");

    const file = new File([csv], "missing-columns.csv", { type: "text/csv" });
    const result = await parseLeadsFromFile(file);

    expect(result.missingColumns).toEqual(["city", "gender", "language"]);
    expect(result.leads[0]).toEqual({
      full_name: "Dipa",
      phone_number: "9090909090",
      city: "-",
      state: "-",
      gender: "male",
      language: "mix",
    });
  });

  it("ignores extra columns and skips invalid rows", async () => {
    const file = createXlsxFile(
      [
        ["full_name", "phone_number", "city", "state", "gender", "language", "notes"],
        ["Esha", "8080808080", "Rajkot", "Gujarat", "female", "gujarati", "VIP"],
        ["", "7070707070", "Rajkot", "Gujarat", "female", "hindi", "Invalid no name"],
        ["Farhan", "", "Rajkot", "Gujarat", "male", "hindi", "Invalid no phone"],
      ],
      "extra-columns.xlsx",
    );

    const parsed = await parseLeadsFromFile(file);
    const { validLeads, skippedRows } = buildLeadInsertPayload(parsed.leads, "2026-04-03T00:00:00.000Z");

    expect(parsed.leads).toHaveLength(3);
    expect(validLeads).toHaveLength(1);
    expect(skippedRows).toBe(2);
    expect(validLeads[0].status).toBe("new");
    expect(validLeads[0].uploaded_at).toBe("2026-04-03T00:00:00.000Z");
  });

  it("converts numeric phone_number values safely", async () => {
    const file = createXlsxFile(
      [
        ["full_name", "phone_number", "city", "state", "gender", "language"],
        ["Gita", 9876543210, "Ahmedabad", "Gujarat", "female", "gujarati"],
      ],
      "numeric-phone.xlsx",
    );

    const parsed = await parseLeadsFromFile(file);
    expect(parsed.missingColumns).toEqual([]);
    expect(parsed.leads[0].phone_number).toBe("9876543210");
  });

  it("detects missing required columns", async () => {
    const csv = [
      "full_name,phone_number,city,state,gender",
      "Harsh,9991112222,Surat,Gujarat,Male",
    ].join("\n");

    const file = new File([csv], "missing-language.csv", { type: "text/csv" });
    const result = await parseLeadsFromFile(file);
    expect(result.missingColumns).toContain("language");
    expect(result.missingColumns).not.toContain("state");
  });
});
