/**
 * Handle messages from Draw.io iframe
 * @param evt - The message event
 * @param handlers - Event handlers for different Draw.io events
 * @param baseUrl - Base URL to validate origin
 */
export function handleEvent(
  evt: MessageEvent,
  handlers: Record<string, (data: any) => void>,
  baseUrl?: string
) {
  // Security check: validate origin
  const allowedOrigins: string[] = [
    'https://embed.diagrams.net',
    'https://www.diagrams.net',
    'https://app.diagrams.net',
    'http://127.0.0.1:8080',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://localhost:3000'
  ];

  if (typeof window !== 'undefined') {
    allowedOrigins.push(window.location.origin);
  }

  // If custom baseUrl is provided, add it to allowed origins
  if (baseUrl) {
    try {
      const isCompleteUrl = baseUrl.startsWith('http://') || baseUrl.startsWith('https://');
      const url = typeof window !== 'undefined'
        ? (isCompleteUrl ? new URL(baseUrl) : new URL(baseUrl, window.location.origin))
        : new URL(baseUrl);
      allowedOrigins.push(url.origin);
    } catch (e) {
      console.warn('Invalid baseUrl provided:', baseUrl);
    }
  }

  if (!allowedOrigins.includes(evt.origin)) {
    return;
  }

  const data = evt.data;

  // Handle string messages (legacy format)
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      handleJsonMessage(parsed, handlers);
    } catch (e) {
      // Not JSON, might be legacy string message
      if (data === 'ready' && handlers.init) {
        handlers.init({ event: 'init' });
      }
    }
    return;
  }

  // Handle JSON protocol messages
  if (typeof data === 'object' && data && data.event) {
    handleJsonMessage(data, handlers);
  }
}

/**
 * Handle parsed JSON message
 * @param data - Parsed message data
 * @param handlers - Event handlers
 */
function handleJsonMessage(data: any, handlers: Record<string, (data: any) => void>) {
  const eventType = data.event;
  const handler = handlers[eventType];

  if (handler && typeof handler === 'function') {
    handler(data);
  }
}
