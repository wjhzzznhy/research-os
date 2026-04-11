export interface SDKConfig {
  baseUrl?: string;
  apiVersion?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

let globalConfig: SDKConfig = {
  baseUrl: '/api',
  apiVersion: 'v1',
  timeout: 30000,
  headers: {},
};

export function configureSDK(config: Partial<SDKConfig>): void {
  globalConfig = { ...globalConfig, ...config };
}

export function getSDKConfig(): SDKConfig {
  return { ...globalConfig };
}

export function getApiBaseUrl(): string {
  const { baseUrl, apiVersion } = globalConfig;
  return `${baseUrl}/${apiVersion}`.replace(/\/+/g, '/');
}
