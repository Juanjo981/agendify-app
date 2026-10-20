import {
  RECETA_MENU_ESTIMATED_WIDTH_PX,
  RECETA_MENU_VIEWPORT_MARGIN_PX,
  computeFixedMenuPlacement,
  estimateRecetaMenuHeight,
  getVisibleViewportSize,
  isMenuClippedVertically,
  resolveRecetaMenuPosition,
} from './receta-menu-position';

describe('receta-menu-position', () => {
  describe('resolveRecetaMenuPosition', () => {
    const baseTrigger = {
      top: 200,
      bottom: 236,
      left: 800,
      right: 880,
      width: 80,
      height: 36,
    };

    it('abre hacia abajo cuando hay espacio inferior suficiente', () => {
      const menuHeight = estimateRecetaMenuHeight({
        showEditar: true,
        showPdf: true,
        showCopia: true,
      });
      const result = resolveRecetaMenuPosition({
        triggerRect: baseTrigger,
        viewportWidth: 1280,
        viewportHeight: 900,
        menuHeight,
        menuWidth: RECETA_MENU_ESTIMATED_WIDTH_PX,
      });
      expect(result.side).toBe('bottom');
      expect(result.alignment).toBe('end');
    });

    it('abre hacia arriba cuando el botón está cerca del borde inferior', () => {
      const menuHeight = 300;
      const result = resolveRecetaMenuPosition({
        triggerRect: {
          top: 820,
          bottom: 856,
          left: 800,
          right: 880,
          width: 80,
          height: 36,
        },
        viewportWidth: 1280,
        viewportHeight: 900,
        menuHeight,
        menuWidth: RECETA_MENU_ESTIMATED_WIDTH_PX,
        margin: RECETA_MENU_VIEWPORT_MARGIN_PX,
      });
      expect(result.side).toBe('top');
      expect(result.availableHeight).toBeGreaterThan(0);
    });

    it('abre hacia arriba si espacio inferior < altura real del menú', () => {
      const menuHeight = 320;
      const result = resolveRecetaMenuPosition({
        triggerRect: {
          top: 700,
          bottom: 820,
          left: 400,
          right: 480,
          width: 80,
          height: 120,
        },
        viewportWidth: 1024,
        viewportHeight: 900,
        menuHeight,
        menuWidth: 240,
      });
      // abajo ~68px < 320 → top
      expect(result.side).toBe('top');
    });

    it('alinea a start cerca del borde derecho si end se sale', () => {
      const result = resolveRecetaMenuPosition({
        triggerRect: {
          top: 100,
          bottom: 136,
          left: 20,
          right: 60,
          width: 40,
          height: 36,
        },
        viewportWidth: 200,
        viewportHeight: 800,
        menuHeight: 200,
        menuWidth: 240,
      });
      expect(result.alignment).toBe('start');
      expect(result.side).toBe('bottom');
    });

    it('elige la dirección con más espacio si no cabe completo', () => {
      const result = resolveRecetaMenuPosition({
        triggerRect: {
          top: 40,
          bottom: 80,
          left: 100,
          right: 180,
          width: 80,
          height: 40,
        },
        viewportWidth: 400,
        viewportHeight: 200,
        menuHeight: 180,
        menuWidth: 240,
      });
      expect(result.side).toBe('bottom');
    });

    it('primera receta (arriba) abre hacia abajo', () => {
      const result = resolveRecetaMenuPosition({
        triggerRect: {
          top: 80,
          bottom: 116,
          left: 900,
          right: 980,
          width: 80,
          height: 36,
        },
        viewportWidth: 1400,
        viewportHeight: 900,
        menuHeight: 320,
        menuWidth: 240,
      });
      expect(result.side).toBe('bottom');
      expect(result.alignment).toBe('end');
    });
  });

  describe('computeFixedMenuPlacement', () => {
    it('última receta cerca del borde inferior abre hacia arriba', () => {
      const placement = computeFixedMenuPlacement({
        triggerRect: {
          top: 820,
          bottom: 856,
          left: 1000,
          right: 1080,
          width: 80,
          height: 36,
        },
        menuWidth: 240,
        menuHeight: 320,
        viewportWidth: 1280,
        viewportHeight: 900,
        margin: 12,
      });
      expect(placement.side).toBe('top');
      expect(placement.top + placement.maxHeight).toBeLessThanOrEqual(856 - 8 + 0.5);
      expect(placement.top).toBeGreaterThanOrEqual(12);
      expect(placement.top + placement.maxHeight).toBeLessThanOrEqual(900 - 12);
    });

    it('acota maxHeight y mantiene el panel dentro del viewport', () => {
      const placement = computeFixedMenuPlacement({
        triggerRect: {
          top: 500,
          bottom: 540,
          left: 900,
          right: 980,
          width: 80,
          height: 40,
        },
        menuWidth: 240,
        menuHeight: 700,
        viewportWidth: 1100,
        viewportHeight: 700,
        margin: 12,
      });
      expect(placement.maxHeight).toBeLessThanOrEqual(700 - 24);
      expect(placement.top).toBeGreaterThanOrEqual(12);
      expect(placement.top + placement.maxHeight).toBeLessThanOrEqual(700 - 12);
    });

    it('alinea left al end del trigger sin salir del viewport', () => {
      const placement = computeFixedMenuPlacement({
        triggerRect: {
          top: 100,
          bottom: 136,
          left: 1000,
          right: 1080,
          width: 80,
          height: 36,
        },
        menuWidth: 240,
        menuHeight: 200,
        viewportWidth: 1280,
        viewportHeight: 900,
      });
      expect(placement.left).toBe(1080 - 240);
      expect(placement.left + 240).toBeLessThanOrEqual(1280 - 12);
    });
  });

  describe('isMenuClippedVertically', () => {
    it('detecta recorte inferior', () => {
      const clipped = isMenuClippedVertically(
        { top: 600, bottom: 920 },
        900,
        12,
      );
      expect(clipped.clippedBottom).toBeTrue();
      expect(clipped.clippedTop).toBeFalse();
    });

    it('no marca recorte si cabe con margen', () => {
      const clipped = isMenuClippedVertically(
        { top: 400, bottom: 700 },
        900,
        12,
      );
      expect(clipped.clippedBottom).toBeFalse();
      expect(clipped.clippedTop).toBeFalse();
    });
  });

  describe('getVisibleViewportSize', () => {
    it('devuelve width/height positivos', () => {
      const vp = getVisibleViewportSize();
      expect(vp.width).toBeGreaterThan(0);
      expect(vp.height).toBeGreaterThan(0);
    });
  });

  describe('estimateRecetaMenuHeight', () => {
    it('crece con más acciones', () => {
      const mini = estimateRecetaMenuHeight({
        showEditar: false,
        showPdf: false,
        showCopia: false,
      });
      const full = estimateRecetaMenuHeight({
        showEditar: true,
        showPdf: true,
        showCopia: true,
      });
      expect(full).toBeGreaterThan(mini);
      expect(full).toBeGreaterThan(280);
    });
  });
});
