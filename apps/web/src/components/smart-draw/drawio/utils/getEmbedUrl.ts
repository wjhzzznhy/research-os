/**
 * Generate the Draw.io embed URL with parameters
 * @param baseUrl - Base URL for Draw.io (defaults to embed.diagrams.net)
 * @param urlParameters - Additional URL parameters
 * @param hasConfiguration - Whether configuration will be sent
 * @returns Complete embed URL
 */
export function getEmbedUrl(
  baseUrl?: string,
  urlParameters: Record<string, string> = {},
  hasConfiguration: boolean = false
): string {
  let base = baseUrl || process.env.NEXT_PUBLIC_DRAWIO_BASE_URL || '/drawio/';
  
  const isCompleteUrl = base.startsWith('http://') || base.startsWith('https://');
  
  if (!base.endsWith('/')) {
    base = base + '/';
  }
  
  // Append index.html to prevent Next.js from stripping the trailing slash
  // which causes relative paths like js/PreConfig.js to resolve incorrectly
  if (!base.endsWith('index.html')) {
    base = base + 'index.html';
  }

  const defaultParams: Record<string, string> = {
    embed: '1',
    proto: 'json',
    spin: '1',
    libraries: '1',
    saveAndExit: '0',
    noSaveBtn: '1',
    noExitBtn: '1',
    ...(hasConfiguration ? { configure: '1' } : {})
  };

  const params = { ...defaultParams, ...urlParameters };

  if (typeof window !== 'undefined') {
    let url: URL;
    if (isCompleteUrl) {
      url = new URL(base);
    } else {
      url = new URL(base, window.location.origin);
    }
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    const result = url.toString();
    return result;
  }

  const separator = base.includes('?') ? '&' : '?';
  const queryString = Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  return `${base}${separator}${queryString}`;
}
