export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidFileSize(size: number, maxSize: number): boolean {
  return size <= maxSize;
}

export function isValidFileType(filename: string, allowedTypes: string[]): boolean {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  return allowedTypes.includes(ext);
}

export function isNotEmpty(value: string | any[] | null | undefined): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}
