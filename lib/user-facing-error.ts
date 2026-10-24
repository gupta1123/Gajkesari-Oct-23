const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';
const NETWORK_ERROR_MESSAGE = "We couldn't connect to the server. Check your internet connection and try again.";

const fallbackForStatus = (status?: number): string | null => {
  if (!status) return null;
  if (status === 400 || status === 422) return 'Please check the information and try again.';
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 402) return 'This action could not be completed. Please contact your administrator.';
  if (status === 403) return 'You do not have permission to perform this action.';
  if (status === 404) return 'The requested information could not be found.';
  if (status === 409) return 'This information was changed elsewhere. Refresh and try again.';
  if (status === 429) return 'Too many requests were made. Please wait a moment and try again.';
  if (status >= 500) return 'The server could not complete the request. Please try again.';
  return null;
};

const isUnhelpfulHttpMessage = (message: string) => {
  const normalized = message.trim().toLowerCase();
  return (
    /^api request failed\b/.test(normalized) ||
    /^request failed with status\b/.test(normalized) ||
    /^network response was not ok\b/.test(normalized) ||
    /^failed to fetch$/.test(normalized) ||
    /^http\s*\d{3}\b/.test(normalized) ||
    /^\d{3}\s*(bad request|unauthorized|payment required|forbidden|not found|conflict|unprocessable entity|too many requests|internal server error)?\.?$/.test(normalized)
  );
};

const cleanMessage = (value: string): string | null => {
  let message = value.trim();
  if (!message) return null;

  if (/^\s*</.test(message) && /<\/?(?:html|body|head|title)\b/i.test(message)) return null;

  const bodyMarker = message.match(/\bBody:\s*/i);
  if (bodyMarker?.index !== undefined) {
    message = message.slice(bodyMarker.index + bodyMarker[0].length).trim();
  }

  if ((message.startsWith('{') && message.endsWith('}')) || (message.startsWith('[') && message.endsWith(']'))) {
    try {
      return extractMessage(JSON.parse(message));
    } catch {
      // Continue with the text form when a backend returns malformed JSON.
    }
  }

  message = message
    .replace(/^error:\s*/i, '')
    .replace(/^api request failed:\s*\d{3}\s*[^.]*\.?\s*/i, '')
    .replace(/^request failed with status\s*\d{3}\.?\s*/i, '')
    .replace(/^\d{3}\s*(?:bad request|unauthorized|payment required|forbidden|not found|conflict|unprocessable entity|too many requests|internal server error)?\s*[:.-]?\s*/i, '')
    .replace(/\s*\((?:http\s*)?\d{3}\)\.?$/i, '.')
    .trim();

  if (/failed to fetch/i.test(message) || /network error:\s*unable to connect/i.test(message)) {
    return NETWORK_ERROR_MESSAGE;
  }
  if (!message || isUnhelpfulHttpMessage(message)) return null;

  return message;
};

const extractMessage = (value: unknown, seen = new Set<unknown>()): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return cleanMessage(value);
  if (typeof value !== 'object') return null;
  if (seen.has(value)) return null;
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      const message = extractMessage(item, seen);
      if (message) return message;
    }
    return null;
  }

  const record = value as Record<string, unknown>;
  const preferredKeys = ['userMessage', 'message', 'detail', 'defaultMessage', 'reason', 'error', 'errors'];
  for (const key of preferredKeys) {
    const message = extractMessage(record[key], seen);
    if (message) return message;
  }

  if (value instanceof Error) return cleanMessage(value.message);
  return null;
};

const extractStatus = (value: unknown): number | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const status = Number((value as Record<string, unknown>).status);
  return Number.isFinite(status) ? status : undefined;
};

export const getUserFacingErrorMessage = (
  error: unknown,
  fallback = DEFAULT_ERROR_MESSAGE,
): string => {
  const record = error && typeof error === 'object' ? error as Record<string, unknown> : null;
  const detailsMessage = extractMessage(record?.details);
  if (detailsMessage) return detailsMessage;

  const directMessage = extractMessage(error);
  if (directMessage) return directMessage;

  return fallbackForStatus(extractStatus(error)) || fallback;
};

export const getResponseErrorMessage = async (
  response: Response,
  fallback = DEFAULT_ERROR_MESSAGE,
): Promise<string> => {
  let details: unknown = null;
  const contentType = response.headers.get('content-type') || '';

  try {
    details = contentType.includes('application/json')
      ? await response.json()
      : await response.text();
  } catch {
    details = null;
  }

  return getUserFacingErrorMessage({ status: response.status, details }, fallback);
};

export { DEFAULT_ERROR_MESSAGE, NETWORK_ERROR_MESSAGE };
