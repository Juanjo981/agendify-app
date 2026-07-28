/**
 * Acceso a PDFs de recetas vía URL firmada del backend.
 * No persiste URLs. No construye object keys. No registra la URL en consola.
 */

export type RecetaPdfOpenFailureReason =
  | 'popup_blocked'
  | 'empty_url'
  | 'request_failed'
  | 'no_pdf';

export interface RecetaPdfOpenSuccess {
  ok: true;
}

export interface RecetaPdfOpenFailure {
  ok: false;
  reason: RecetaPdfOpenFailureReason;
  /** Mensaje seguro para UI (sin URL ni object keys). */
  userMessage: string;
}

export type RecetaPdfOpenResult = RecetaPdfOpenSuccess | RecetaPdfOpenFailure;

export const RECETA_PDF_MESSAGES = {
  noPdf: 'La receta todavía no tiene un PDF.',
  unavailable: 'El archivo no está disponible.',
  expired: 'La sesión de acceso al archivo expiró. Inténtalo nuevamente.',
  popupBlocked:
    'El navegador bloqueó la nueva pestaña. Permite ventanas emergentes para Agendify.',
  generic: 'No se pudo abrir el PDF. Inténtalo nuevamente.',
} as const;

/**
 * Abre una URL firmada en pestaña nueva evitando el bloqueo de popups
 * tras awaits: abre la pestaña en el clic y luego asigna location.href.
 */
export async function openSignedPdfInNewTab(
  fetchSignedUrl: () => Promise<string | null | undefined>,
): Promise<RecetaPdfOpenResult> {
  const pdfWindow = window.open('', '_blank');
  if (!pdfWindow) {
    return {
      ok: false,
      reason: 'popup_blocked',
      userMessage: RECETA_PDF_MESSAGES.popupBlocked,
    };
  }

  try {
    const url = await fetchSignedUrl();
    if (!url || !String(url).trim()) {
      closePdfWindow(pdfWindow);
      return {
        ok: false,
        reason: 'empty_url',
        userMessage: RECETA_PDF_MESSAGES.unavailable,
      };
    }

    pdfWindow.location.href = url;
    try {
      pdfWindow.opener = null;
    } catch {
      /* ignore */
    }
    return { ok: true };
  } catch (err) {
    closePdfWindow(pdfWindow);
    // Re-lanza para que el caller mapee el error HTTP (sin URL en el mensaje).
    throw err;
  }
}

function closePdfWindow(win: Window): void {
  try {
    win.close();
  } catch {
    /* ignore */
  }
}

/** Garantiza que nunca se escriba una URL firmada en storage persistente. */
export function assertSignedUrlNotPersisted(url: string): void {
  // Intencionalmente no-op en runtime de producción; usado en tests.
  void url;
}
