/**
 * Posicionamiento del menú contextual “Más” de recetas.
 * Escritorio: portal fixed bajo body (no Ionic Popover).
 * Usa visualViewport y altura medida del panel real.
 */

export type RecetaMenuSide = 'top' | 'bottom';
export type RecetaMenuAlignment = 'start' | 'end';

export interface ViewportSize {
  width: number;
  height: number;
  offsetTop: number;
  offsetLeft: number;
}

export interface RecetaMenuPositionInput {
  triggerRect: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'right' | 'width' | 'height'>;
  viewportWidth: number;
  viewportHeight: number;
  menuHeight: number;
  menuWidth: number;
  margin?: number;
}

export interface RecetaMenuPositionResult {
  side: RecetaMenuSide;
  alignment: RecetaMenuAlignment;
  availableHeight: number;
}

/** Coordenadas CSS `position: fixed` relativas al viewport. */
export interface RecetaMenuFixedPlacement {
  side: RecetaMenuSide;
  top: number;
  left: number;
  maxHeight: number;
}

export const RECETA_MENU_ESTIMATED_WIDTH_PX = 240;
export const RECETA_MENU_VIEWPORT_MARGIN_PX = 12;
export const RECETA_MENU_GAP_PX = 8;
export const RECETA_MENU_MIN_HEIGHT_PX = 160;

export function getVisibleViewportSize(): ViewportSize {
  const vv = window.visualViewport;
  if (vv && vv.height > 0 && vv.width > 0) {
    return {
      width: vv.width,
      height: vv.height,
      offsetTop: vv.offsetTop,
      offsetLeft: vv.offsetLeft,
    };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    offsetTop: 0,
    offsetLeft: 0,
  };
}

export function estimateRecetaMenuHeight(input: {
  showEditar: boolean;
  showPdf: boolean;
  showCopia: boolean;
}): number {
  let items = 1;
  if (input.showEditar) items += 1;
  if (input.showPdf) items += 3;
  if (input.showCopia) items += 1;
  const seps = (input.showPdf ? 1 : 0) + (input.showCopia ? 1 : 0);
  return 44 + 12 + items * 42 + seps * 10;
}

export function resolveRecetaMenuPosition(
  input: RecetaMenuPositionInput,
): RecetaMenuPositionResult {
  const margin = input.margin ?? RECETA_MENU_VIEWPORT_MARGIN_PX;
  const { triggerRect, viewportWidth, viewportHeight, menuHeight, menuWidth } = input;

  const espacioAbajo = viewportHeight - triggerRect.bottom - margin;
  const espacioArriba = triggerRect.top - margin;

  // Preferir arriba si el trigger está en la mitad inferior O no cabe abajo.
  const enMitadInferior = triggerRect.top > viewportHeight / 2;
  let side: RecetaMenuSide;
  if (enMitadInferior) {
    side =
      espacioArriba >= Math.min(menuHeight + RECETA_MENU_GAP_PX, espacioAbajo)
        ? 'top'
        : espacioAbajo >= menuHeight + RECETA_MENU_GAP_PX
          ? 'bottom'
          : espacioArriba >= espacioAbajo
            ? 'top'
            : 'bottom';
  } else if (espacioAbajo >= menuHeight + RECETA_MENU_GAP_PX) {
    side = 'bottom';
  } else if (espacioArriba >= menuHeight + RECETA_MENU_GAP_PX) {
    side = 'top';
  } else {
    side = espacioArriba > espacioAbajo ? 'top' : 'bottom';
  }

  const leftIfEnd = triggerRect.right - menuWidth;
  const leftIfStart = triggerRect.left;
  const endFits = leftIfEnd >= margin && leftIfEnd + menuWidth <= viewportWidth - margin;
  const startFits = leftIfStart >= margin && leftIfStart + menuWidth <= viewportWidth - margin;

  let alignment: RecetaMenuAlignment;
  if (endFits) {
    alignment = 'end';
  } else if (startFits) {
    alignment = 'start';
  } else {
    const overflowEnd = Math.max(0, margin - leftIfEnd);
    const overflowStart = Math.max(0, leftIfStart + menuWidth - (viewportWidth - margin));
    alignment = overflowEnd <= overflowStart ? 'end' : 'start';
  }

  const availableHeight = Math.max(
    RECETA_MENU_MIN_HEIGHT_PX,
    (side === 'top' ? espacioArriba : espacioAbajo) - RECETA_MENU_GAP_PX,
  );

  return { side, alignment, availableHeight };
}

/**
 * Calcula top/left/maxHeight para un panel `position: fixed` bajo body.
 * Usa altura/ancho ya medidos del panel real.
 */
export function computeFixedMenuPlacement(input: {
  triggerRect: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'right' | 'width' | 'height'>;
  menuWidth: number;
  menuHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  margin?: number;
  gap?: number;
}): RecetaMenuFixedPlacement {
  const margin = input.margin ?? RECETA_MENU_VIEWPORT_MARGIN_PX;
  const gap = input.gap ?? RECETA_MENU_GAP_PX;
  const { triggerRect, menuWidth, menuHeight, viewportWidth, viewportHeight } = input;

  const resolved = resolveRecetaMenuPosition({
    triggerRect,
    viewportWidth,
    viewportHeight,
    menuHeight,
    menuWidth,
    margin,
  });

  const maxHeight = Math.min(menuHeight, resolved.availableHeight);
  // Altura de layout = menú natural acotado al espacio (no inflar con min-height).
  const alturaVisible = Math.max(1, maxHeight);

  let top =
    resolved.side === 'top'
      ? triggerRect.top - alturaVisible - gap
      : triggerRect.bottom + gap;

  top = Math.max(margin, Math.min(top, viewportHeight - alturaVisible - margin));

  let left =
    resolved.alignment === 'end'
      ? triggerRect.right - menuWidth
      : triggerRect.left;

  left = Math.max(margin, Math.min(left, viewportWidth - menuWidth - margin));

  // Defensa final vertical.
  const bottom = top + alturaVisible;
  if (bottom > viewportHeight - margin) {
    top = Math.max(margin, viewportHeight - margin - alturaVisible);
  }
  if (top < margin) {
    top = margin;
  }

  // Si tras clampear el espacio vertical real es menor, reducir maxHeight.
  const spaceFromTop = viewportHeight - margin - top;
  const finalMaxHeight = Math.min(alturaVisible, Math.max(120, spaceFromTop));

  return {
    side: resolved.side,
    top,
    left,
    maxHeight: finalMaxHeight,
  };
}

export function isMenuClippedVertically(
  menuRect: Pick<DOMRect, 'top' | 'bottom'>,
  viewportHeight: number,
  margin = RECETA_MENU_VIEWPORT_MARGIN_PX,
): { clippedBottom: boolean; clippedTop: boolean } {
  return {
    clippedBottom: menuRect.bottom > viewportHeight - margin + 0.5,
    clippedTop: menuRect.top < margin - 0.5,
  };
}
