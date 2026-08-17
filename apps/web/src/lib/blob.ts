import type { Preview } from "../types/domain";

export async function makePreview(name: string, blob: Blob): Promise<Preview> {
  const text =
    blob.type.startsWith("text/") ||
    blob.type === "application/json" ||
    blob.type === "application/xml" ||
    blob.type.endsWith("+json") ||
    blob.type.endsWith("+xml");
  return text
    ? { name, mimeType: blob.type, text: await blob.text() }
    : { name, mimeType: blob.type, url: URL.createObjectURL(blob) };
}

export function saveBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
