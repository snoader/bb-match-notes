export function canShareFiles(files: File[]): boolean {
  if (!navigator.share || files.length === 0) return false;
  if (!navigator.canShare) return false;
  return navigator.canShare({ files });
}

export async function shareFile(file: File, title?: string): Promise<boolean> {
  if (!canShareFiles([file])) return false;
  await navigator.share({ title, files: [file] });
  return true;
}

export function downloadFile(blob: Blob, filename: string, mime?: string) {
  const typedBlob = mime ? new Blob([blob], { type: mime }) : blob;
  const url = URL.createObjectURL(typedBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function printPdf(blob: Blob) {
  const pdfBlob = blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });
  const url = URL.createObjectURL(pdfBlob);
  const printWindow = window.open(url, "_blank");

  if (!printWindow) {
    window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  const cleanup = () => URL.revokeObjectURL(url);
  printWindow.addEventListener("load", () => {
    printWindow.focus();
    printWindow.print();
    setTimeout(cleanup, 2_000);
  });
  setTimeout(cleanup, 60_000);
}

