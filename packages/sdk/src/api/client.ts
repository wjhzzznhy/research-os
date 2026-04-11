import { getSDKConfig, getApiBaseUrl } from '../config';

export interface ApiRequestOptions extends RequestInit {
  timeout?: number;
  onUploadProgress?: (progress: number) => void;
}

export interface ApiUploadOptions extends ApiRequestOptions {
  onUploadProgress?: (progress: number) => void;
  formData?: FormData;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
}

export class ApiError extends Error {
  status: number;
  statusText: string;
  data?: any;

  constructor(status: number, statusText: string, data?: any) {
    super(`API Error: ${status} ${statusText}`);
    this.status = status;
    this.statusText = statusText;
    this.data = data;
    this.name = 'ApiError';
  }
}

async function request<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const config = getSDKConfig();
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const timeout = options.timeout || config.timeout || 30000;

  const controller = new AbortController();
  const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type');
    let data;

    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      throw new ApiError(response.status, response.statusText, data);
    }

    return {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(408, 'Request Timeout');
    }
    throw new ApiError(500, 'Network Error', error);
  }
}

export const apiClient = {
  get: <T = any>(endpoint: string, options?: ApiRequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, data?: any, options?: ApiRequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = any>(endpoint: string, data?: any, options?: ApiRequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: ApiRequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),

  upload: <T = any>(
    endpoint: string,
    file: File,
    options?: ApiUploadOptions
  ): Promise<ApiResponse<T>> => {
    return new Promise((resolve, reject) => {
      const config = getSDKConfig();
      const baseUrl = getApiBaseUrl();
      const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

      const xhr = new XMLHttpRequest();
      const formData = options?.formData ?? new FormData();
      if (!formData.has('file')) {
        formData.append('file', file);
      }

      xhr.open('POST', url);

      Object.entries(config.headers || {}).forEach(([key, value]) => {
        if (key !== 'Content-Type') {
          xhr.setRequestHeader(key, value);
        }
      });

      if (options?.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
      }

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && options?.onUploadProgress) {
          options.onUploadProgress((e.loaded / e.total) * 100);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          let data;
          try {
            data = JSON.parse(xhr.responseText);
          } catch {
            data = xhr.responseText;
          }
          resolve({
            data,
            status: xhr.status,
            statusText: xhr.statusText,
            headers: new Headers(),
          });
        } else {
          let data;
          try {
            data = JSON.parse(xhr.responseText);
          } catch {
            data = xhr.responseText;
          }
          reject(new ApiError(xhr.status, xhr.statusText, data));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new ApiError(500, 'Network Error'));
      });

      xhr.addEventListener('abort', () => {
        reject(new ApiError(408, 'Request Aborted'));
      });

      xhr.send(formData);
    });
  },

  sse: (endpoint: string, options: { onMessage: (data: any) => void; onError?: (error: any) => void; onClose?: () => void; body?: any }) => {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    if (options.body) {
      const controller = new AbortController();

      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options.body),
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok || !response.body) {
            options.onError?.(new Error(`SSE request failed: ${response.status}`));
            return;
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const dataStr = line.slice(6).trim();
                  if (dataStr === '[DONE]') continue;
                  try {
                    options.onMessage(JSON.parse(dataStr));
                  } catch {
                    options.onMessage(dataStr);
                  }
                }
              }
            }
          } catch (err) {
            if (!controller.signal.aborted) {
              options.onError?.(err);
            }
          }

          options.onClose?.();
        })
        .catch((err) => {
          options.onError?.(err);
        });

      return () => {
        controller.abort();
        options.onClose?.();
      };
    }

    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        options.onMessage(data);
      } catch (e) {
        options.onMessage(event.data);
      }
    };

    eventSource.onerror = (error) => {
      options.onError?.(error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
      options.onClose?.();
    };
  },
};
