import { ApiError } from '../api/client';

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (typeof error.data === 'string') {
      return error.data;
    }
    if (error.data?.message) {
      return error.data.message;
    }
    return `${error.status}: ${error.statusText}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred';
}

export function getErrorStatus(error: unknown): number {
  if (isApiError(error)) {
    return error.status;
  }
  return 500;
}
