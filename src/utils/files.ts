export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function downloadJSON(data: unknown, filename: string) {
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename);
}

export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

export function slug(name: string): string {
  return name.trim().replace(/\s+/g, '_').replace(/[^\w-]/g, '') || 'material';
}
