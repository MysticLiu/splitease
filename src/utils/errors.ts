type ErrorLike = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
};

const asErrorLike = (error: unknown): ErrorLike | null => {
  if (!error || typeof error !== 'object') return null;
  return error as ErrorLike;
};

export function getErrorCode(error: unknown): string | null {
  const errorLike = asErrorLike(error);
  if (!errorLike || typeof errorLike.code !== 'string') return null;
  return errorLike.code;
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  const errorLike = asErrorLike(error);
  if (!errorLike) return fallback;

  const message = typeof errorLike.message === 'string' ? errorLike.message.trim() : '';
  const details = typeof errorLike.details === 'string' ? errorLike.details.trim() : '';
  const hint = typeof errorLike.hint === 'string' ? errorLike.hint.trim() : '';

  const extras = [details, hint].filter(Boolean).join(' ');
  if (message && extras) return `${message} ${extras}`;
  if (message) return message;
  if (extras) return extras;
  return fallback;
}
