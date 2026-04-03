import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorResponse } from '../models/auth.models';

// ── Known backend error codes ─────────────────────────────────────────────────

export const API_ERROR_CODES = {
  VALIDATION_ERROR:            'VALIDATION_ERROR',
  MALFORMED_JSON:              'MALFORMED_JSON',
  MISSING_PARAMETER:           'MISSING_PARAMETER',
  TYPE_MISMATCH:               'TYPE_MISMATCH',
  INVALID_ARGUMENT:            'INVALID_ARGUMENT',
  BAD_REQUEST:                 'BAD_REQUEST',
  CODIGO_BETA_INVALIDO:        'CODIGO_BETA_INVALIDO',
  CODIGO_VINCULACION_INVALIDO: 'CODIGO_VINCULACION_INVALIDO',
  UNAUTHORIZED:                'UNAUTHORIZED',
  TOKEN_INVALID:               'TOKEN_INVALID',
  TOKEN_EXPIRED:               'TOKEN_EXPIRED',
  FORBIDDEN:                   'FORBIDDEN',
  RESOURCE_NOT_FOUND:          'RESOURCE_NOT_FOUND',
  EMAIL_DUPLICADO:             'EMAIL_DUPLICADO',
  USUARIO_DUPLICADO:           'USUARIO_DUPLICADO',
  DATA_INTEGRITY:              'DATA_INTEGRITY',
  ILLEGAL_STATE:               'ILLEGAL_STATE',
  BUSINESS_ERROR:              'BUSINESS_ERROR',
  INTERNAL_ERROR:              'INTERNAL_ERROR',
} as const;

export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES];

// ── Result shape returned to components ───────────────────────────────────────

export interface MappedApiError {
  /** User-facing message, always safe to display */
  userMessage:  string;
  /** Field → message map extracted from `details`, keyed by backend field name */
  fieldErrors?: Record<string, string>;
  /** Backend code string for branching logic in components */
  code?:        string;
  /** HTTP status code */
  status?:      number;
  /** Original parsed body for edge-case access */
  raw?:         ApiErrorResponse;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Translate raw Java/Spring validation messages to Spanish.
 * Falls back to the original string when no match is found.
 */
export function humanizeFieldError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('must not be blank') || lower.includes('must not be null')) {
    return 'Este campo es requerido';
  }
  if (
    lower.includes('must be a valid email') ||
    lower.includes('invalid email') ||
    lower.includes('no es un formato') ||
    lower.includes('formato invalido')
  ) {
    return 'El formato de email no es válido';
  }
  if (lower.includes('size must be between')) {
    return 'La longitud del campo no es válida';
  }
  if (lower.includes('must be greater') || lower.includes('must be less')) {
    return 'El valor está fuera del rango permitido';
  }
  if (lower.includes('must be a number') || lower.includes('must be positive')) {
    return 'Debe ser un número válido';
  }
  return raw;
}

/**
 * Parse `details` array like `["email: must not be blank", "nombre: must not be blank"]`
 * into `{ email: "must not be blank", nombre: "must not be blank" }`.
 */
function parseDetailsToFieldErrors(details: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const detail of details) {
    const colonIdx = detail.indexOf(':');
    if (colonIdx > 0) {
      const field = detail.substring(0, colonIdx).trim();
      const msg   = detail.substring(colonIdx + 1).trim();
      result[field] = msg;
    }
  }
  return result;
}

function statusFallback(status: number): string {
  switch (status) {
    case 400: return 'La solicitud no pudo procesarse. Revisa los datos ingresados.';
    case 401: return 'Credenciales inválidas o sesión expirada.';
    case 403: return 'No tienes permisos para realizar esta acción.';
    case 404: return 'El recurso solicitado no fue encontrado.';
    case 409: return 'Ya existe un registro con esos datos.';
    case 422: return 'No se pudo completar la operación.';
    case 500: return 'Ocurrió un error en el servidor. Por favor intenta de nuevo más tarde.';
    default:  return 'Ocurrió un error inesperado. Por favor intenta de nuevo.';
  }
}

// ── Main mapper ───────────────────────────────────────────────────────────────

/**
 * Convert an Angular `HttpErrorResponse` (or any caught error) into a
 * `MappedApiError` ready for consumption by components and interceptors.
 *
 * Priority:
 *   1. Network / offline (status 0)  → connection message
 *   2. Backend body with `code`      → code-based message
 *   3. Backend body with `message`   → use backend message directly
 *   4. HTTP status fallback          → generic message per status
 */
export function mapApiError(err: unknown): MappedApiError {
  // Not an HTTP error (e.g., thrown inside service code)
  if (!(err instanceof HttpErrorResponse)) {
    return { userMessage: 'Ocurrió un error inesperado. Por favor intenta de nuevo.' };
  }

  // Network / CORS / offline (ProgressEvent or status 0)
  if (err.status === 0 || err.error instanceof ProgressEvent) {
    return {
      userMessage: 'No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.',
      status: 0,
    };
  }

  const body        = err.error as Partial<ApiErrorResponse> | null ?? {};
  const code        = body?.code;
  const message     = body?.message;
  const details     = body?.details ?? [];
  const fieldErrors = details.length > 0 ? parseDetailsToFieldErrors(details) : undefined;

  switch (code) {

    // ── Auth ────────────────────────────────────────────────────────────────
    case API_ERROR_CODES.UNAUTHORIZED:
      return {
        userMessage: 'Credenciales inválidas. Verifica tu usuario y contraseña.',
        code, status: err.status, raw: body as ApiErrorResponse,
      };

    case API_ERROR_CODES.TOKEN_EXPIRED:
      return {
        userMessage: 'Tu sesión expiró. Inicia sesión nuevamente.',
        code, status: err.status, raw: body as ApiErrorResponse,
      };

    case API_ERROR_CODES.TOKEN_INVALID:
      return {
        userMessage: 'La sesión no es válida. Inicia sesión nuevamente.',
        code, status: err.status, raw: body as ApiErrorResponse,
      };

    case API_ERROR_CODES.FORBIDDEN:
      return {
        userMessage: 'No tienes permisos para realizar esta acción.',
        code, status: err.status, raw: body as ApiErrorResponse,
      };

    // ── Duplicate data ──────────────────────────────────────────────────────
    case API_ERROR_CODES.EMAIL_DUPLICADO:
      return {
        userMessage: 'Ya existe una cuenta registrada con ese correo electrónico.',
        fieldErrors: { email: 'Este correo ya está registrado' },
        code, status: err.status, raw: body as ApiErrorResponse,
      };

    case API_ERROR_CODES.USUARIO_DUPLICADO:
      return {
        userMessage: 'Ese nombre de usuario ya está en uso. Elige otro.',
        fieldErrors: { username: 'Este usuario ya está en uso' },
        code, status: err.status, raw: body as ApiErrorResponse,
      };

    // ── Registration codes ──────────────────────────────────────────────────
    case API_ERROR_CODES.CODIGO_BETA_INVALIDO:
      return {
        userMessage:  message ?? 'El código beta no es válido o ya fue utilizado.',
        fieldErrors:  { codigo_beta: message ?? 'Código beta inválido o expirado' },
        code, status: err.status, raw: body as ApiErrorResponse,
      };

    case API_ERROR_CODES.CODIGO_VINCULACION_INVALIDO:
      return {
        userMessage:  message ?? 'El código de vinculación no es válido o ya fue utilizado.',
        fieldErrors:  { codigo_vinculacion: message ?? 'Código de vinculación inválido' },
        code, status: err.status, raw: body as ApiErrorResponse,
      };

    // ── Validation ──────────────────────────────────────────────────────────
    case API_ERROR_CODES.VALIDATION_ERROR:
      return {
        userMessage:  message ?? 'Los datos ingresados no son válidos.',
        fieldErrors:  fieldErrors && Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
        code, status: err.status, raw: body as ApiErrorResponse,
      };

    // ── Bad request family ──────────────────────────────────────────────────
    case API_ERROR_CODES.MALFORMED_JSON:
    case API_ERROR_CODES.MISSING_PARAMETER:
    case API_ERROR_CODES.TYPE_MISMATCH:
    case API_ERROR_CODES.INVALID_ARGUMENT:
    case API_ERROR_CODES.BAD_REQUEST:
      return {
        userMessage: 'La solicitud no pudo procesarse. Revisa los datos ingresados.',
        code, status: err.status, raw: body as ApiErrorResponse,
      };

    // ── Not found ───────────────────────────────────────────────────────────
    case API_ERROR_CODES.RESOURCE_NOT_FOUND:
      return {
        userMessage: message ?? 'El recurso solicitado no fue encontrado.',
        code, status: err.status, raw: body as ApiErrorResponse,
      };

    // ── Conflict / integrity ────────────────────────────────────────────────
    case API_ERROR_CODES.DATA_INTEGRITY:
    case API_ERROR_CODES.ILLEGAL_STATE:
      return {
        userMessage: message ?? 'Conflicto de datos. Intenta de nuevo.',
        code, status: err.status, raw: body as ApiErrorResponse,
      };

    case API_ERROR_CODES.BUSINESS_ERROR:
      return {
        userMessage: message ?? 'No se pudo completar la operación.',
        code, status: err.status, raw: body as ApiErrorResponse,
      };

    // ── Server error ────────────────────────────────────────────────────────
    case API_ERROR_CODES.INTERNAL_ERROR:
      return {
        userMessage: 'Ocurrió un error en el servidor. Por favor intenta de nuevo más tarde.',
        code, status: err.status, raw: body as ApiErrorResponse,
      };

    // ── Unknown code or no code ─────────────────────────────────────────────
    default:
      if (message) {
        return { userMessage: message, code, status: err.status, fieldErrors, raw: body as ApiErrorResponse };
      }
      return { userMessage: statusFallback(err.status), status: err.status };
  }
}
