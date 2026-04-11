function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.startsWith('http')) {
    try {
      const urlObj = new URL(envUrl);
      return urlObj.origin;
    } catch {
      // ignore
    }
  }

  const port = window.location.port;
  if (port) {
    return `${window.location.protocol}//${window.location.hostname}:${port}`;
  }

  const devPort = process.env.NODE_ENV === 'development' ? '3000' : null;
  if (devPort && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return `${window.location.protocol}//${window.location.hostname}:${devPort}`;
  }

  return window.location.origin;
}

export function toDrawioImageUrl(url: string): string {
  const normalized = url?.trim();

  if (!normalized) {
    return url;
  }

  if (normalized.startsWith('data:') || normalized.startsWith('blob:')) {
    return normalized;
  }

  if (/^https?:\/\//i.test(normalized)) {
    try {
      const urlObj = new URL(normalized);
      const apiBaseUrl = getApiBaseUrl();

      if ((urlObj.hostname === '127.0.0.1' || urlObj.hostname === 'localhost') && !urlObj.port) {
        if (apiBaseUrl) {
          const baseUrlObj = new URL(apiBaseUrl);
          if (baseUrlObj.port) {
            urlObj.port = baseUrlObj.port;
            return urlObj.toString();
          }
        }
      }
    } catch {
      // ignore
    }
    return normalized;
  }

  if (normalized.startsWith('/')) {
    if (typeof window !== 'undefined') {
      const apiBaseUrl = getApiBaseUrl();
      return `${apiBaseUrl}${normalized}`;
    }
    return normalized;
  }

  return normalized;
}

export function rewriteDrawioXmlImageUrls(xml: string): string {
  if (!xml) {
    return xml;
  }

  return xml.replace(/image=([^;"]+)/g, (segment, rawUrl) => {
    const nextUrl = toDrawioImageUrl(rawUrl);
    return nextUrl === rawUrl ? segment : `image=${nextUrl}`;
  });
}
