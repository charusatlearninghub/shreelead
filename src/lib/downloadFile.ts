import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";

/**
 * Save CSV text to a file. On Android (native app) writes to the public
 * Downloads/ShreeLead folder via Capacitor Filesystem. In a browser /
 * Chrome mobile it falls back to a standard <a download> trigger which
 * the browser routes to its Downloads folder.
 */
export async function downloadCsv(filename: string, csv: string): Promise<{ savedTo: string; native: boolean }> {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    // Write to Downloads/ShreeLead/<filename>
    const path = `ShreeLead/${filename}`;
    await Filesystem.writeFile({
      path,
      data: csv,
      directory: Directory.ExternalStorage,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    // ExternalStorage on Android maps to /storage/emulated/0
    return { savedTo: `Downloads/ShreeLead/${filename}`, native: true };
  }

  // Browser fallback
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { savedTo: filename, native: false };
}

export function buildLeadsFilename(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `leads_${y}_${m}_${d}.csv`;
}