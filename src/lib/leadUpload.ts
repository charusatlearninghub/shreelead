import * as XLSX from "xlsx";

export interface UploadLeadRow {
  full_name: string;
  phone_number: string;
  city: string;
  state: string;
  gender: string;
  language: string;
}

export interface ParsedUploadResult {
  leads: UploadLeadRow[];
  missingColumns: string[];
  detectedColumns: string[];
  fileType: "csv" | "xlsx";
}

export interface LeadInsertRow extends UploadLeadRow {
  status: "new";
  sold_to: null;
  sold_at: null;
  uploaded_at: string;
}

const REQUIRED_COLUMNS = ["full_name", "phone_number", "city", "gender", "language"] as const;

type RequiredColumn = (typeof REQUIRED_COLUMNS)[number];

const COLUMN_ALIASES: Record<RequiredColumn, string[]> = {
  full_name: ["full_name", "full name", "name"],
  phone_number: ["phone_number", "phone number", "phone", "mobile", "mobile_number"],
  city: ["city"],
  gender: ["gender"],
  language: ["language"],
};

const normalizeColumnName = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "_");

const normalizeText = (value?: unknown) => String(value ?? "").trim();

const sanitizeOptionalText = (value?: string, fallback = "-") => {
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : fallback;
};

export const normalizeGender = (value?: string, fallback: "male" | "female" | "mix" = "male") => {
  const normalized = normalizeText(value).toLowerCase();
  return normalized === "male" || normalized === "female" || normalized === "mix"
    ? normalized
    : fallback;
};

export const normalizeLanguage = (value?: string, fallback: "gujarati" | "hindi" | "mix" = "mix") => {
  const normalized = normalizeText(value).toLowerCase();
  return normalized === "gujarati" || normalized === "hindi" || normalized === "mix"
    ? normalized
    : fallback;
};

const readFileText = async (file: File) => {
  if (typeof file.text === "function") {
    return file.text();
  }

  const blob = file as unknown as Blob;

  if (typeof blob.text === "function") {
    return blob.text();
  }

  if (typeof FileReader !== "undefined") {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error || new Error("Failed to read file text"));
      reader.readAsText(blob);
    });
  }

  return new Response(blob).text();
};

const readFileArrayBuffer = async (file: File) => {
  if (typeof file.arrayBuffer === "function") {
    return file.arrayBuffer();
  }

  const blob = file as unknown as Blob;

  if (typeof blob.arrayBuffer === "function") {
    return blob.arrayBuffer();
  }

  if (typeof FileReader !== "undefined") {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as ArrayBuffer) || new ArrayBuffer(0));
      reader.onerror = () => reject(reader.error || new Error("Failed to read file bytes"));
      reader.readAsArrayBuffer(blob);
    });
  }

  return new Response(blob).arrayBuffer();
};

const getWorkbook = async (file: File) => {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "csv") {
    const text = await readFileText(file);
    return { workbook: XLSX.read(text, { type: "string" }), fileType: "csv" as const };
  }

  if (ext === "xlsx") {
    const buffer = await readFileArrayBuffer(file);
    return { workbook: XLSX.read(buffer, { type: "array" }), fileType: "xlsx" as const };
  }

  throw new Error("Unsupported file type. Please upload CSV or XLSX.");
};

export const parseLeadsFromFile = async (file: File): Promise<ParsedUploadResult> => {
  const { workbook, fileType } = await getWorkbook(file);
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return { leads: [], missingColumns: [...REQUIRED_COLUMNS], detectedColumns: [], fileType };
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Array<string | number | boolean | null>>(sheet, {
    header: 1,
    raw: false,
    defval: "",
  });

  if (rows.length < 2) {
    return { leads: [], missingColumns: [...REQUIRED_COLUMNS], detectedColumns: [], fileType };
  }

  const headers = (rows[0] || []).map((cell) => normalizeColumnName(String(cell ?? ""))).filter(Boolean);
  const columnIndex: Record<RequiredColumn, number> = {
    full_name: -1,
    phone_number: -1,
    city: -1,
    gender: -1,
    language: -1,
  };

  for (const column of REQUIRED_COLUMNS) {
    columnIndex[column] = headers.findIndex((header) => COLUMN_ALIASES[column].includes(header));
  }

  const missingColumns = REQUIRED_COLUMNS.filter((column) => columnIndex[column] < 0);

  const leads: UploadLeadRow[] = rows.slice(1).map((row) => {
    const getValue = (column: RequiredColumn | "state") => {
      if (column === "state") {
        const stateIndex = headers.findIndex((header) => header === "state");
        return stateIndex >= 0 ? normalizeText(row[stateIndex]) : "";
      }

      const idx = columnIndex[column as RequiredColumn];
      return idx >= 0 ? normalizeText(row[idx]) : "";
    };

    return {
      full_name: normalizeText(getValue("full_name")),
      phone_number: normalizeText(getValue("phone_number")),
      city: sanitizeOptionalText(getValue("city"), "-"),
      state: sanitizeOptionalText(getValue("state"), "-"),
      gender: normalizeGender(getValue("gender"), "male"),
      language: normalizeLanguage(getValue("language"), "mix"),
    };
  });

  return { leads, missingColumns, detectedColumns: headers, fileType };
};

export const buildLeadInsertPayload = (rows: UploadLeadRow[], uploadedAtIso = new Date().toISOString()) => {
  let skippedRows = 0;

  const validLeads: LeadInsertRow[] = [];
  for (const row of rows) {
    const fullName = normalizeText(row.full_name);
    const phoneNumber = normalizeText(row.phone_number);

    if (!fullName || !phoneNumber) {
      skippedRows += 1;
      continue;
    }

    validLeads.push({
      full_name: fullName,
      phone_number: phoneNumber,
      city: sanitizeOptionalText(row.city, "-"),
      state: sanitizeOptionalText(row.state, "-"),
      gender: normalizeGender(row.gender, "male"),
      language: normalizeLanguage(row.language, "mix"),
      status: "new",
      sold_to: null,
      sold_at: null,
      uploaded_at: uploadedAtIso,
    });
  }

  return { validLeads, skippedRows };
};
