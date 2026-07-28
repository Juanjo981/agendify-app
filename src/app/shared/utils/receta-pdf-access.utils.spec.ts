import {
  RECETA_PDF_MESSAGES,
  openSignedPdfInNewTab,
} from './receta-pdf-access.utils';
import { buildRecetaVersionHistorial } from '../models/recetas.models';

describe('openSignedPdfInNewTab', () => {
  let openSpy: jasmine.Spy;
  let fakeWindow: { location: { href: string }; close: jasmine.Spy; opener: unknown };

  beforeEach(() => {
    fakeWindow = {
      location: { href: '' },
      close: jasmine.createSpy('close'),
      opener: {},
    };
    openSpy = spyOn(window, 'open').and.returnValue(fakeWindow as unknown as Window);
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('1. solicita URL y abre pestaña (inline flow)', async () => {
    const fetchUrl = jasmine.createSpy('fetchUrl').and.resolveTo('https://signed.example/pdf?sig=1');
    const result = await openSignedPdfInNewTab(fetchUrl);

    expect(openSpy).toHaveBeenCalledWith('', '_blank');
    expect(fetchUrl).toHaveBeenCalled();
    expect(fakeWindow.location.href).toBe('https://signed.example/pdf?sig=1');
    expect(result.ok).toBeTrue();
    expect(fakeWindow.opener).toBeNull();
  });

  it('2. abre pestaña vacía antes del await', async () => {
    let openedBeforeFetch = false;
    const fetchUrl = jasmine.createSpy('fetchUrl').and.callFake(async () => {
      openedBeforeFetch = openSpy.calls.count() === 1;
      return 'https://signed.example/ok';
    });

    await openSignedPdfInNewTab(fetchUrl);
    expect(openedBeforeFetch).toBeTrue();
  });

  it('3. maneja popup bloqueado', async () => {
    openSpy.and.returnValue(null);
    const fetchUrl = jasmine.createSpy('fetchUrl');
    const result = await openSignedPdfInNewTab(fetchUrl);

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.reason).toBe('popup_blocked');
      expect(result.userMessage).toBe(RECETA_PDF_MESSAGES.popupBlocked);
    }
    expect(fetchUrl).not.toHaveBeenCalled();
  });

  it('4. cierra pestaña vacía si falla la solicitud', async () => {
    const err = new Error('network');
    const fetchUrl = jasmine.createSpy('fetchUrl').and.rejectWith(err);

    await expectAsync(openSignedPdfInNewTab(fetchUrl)).toBeRejectedWith(err);
    expect(fakeWindow.close).toHaveBeenCalled();
    expect(fakeWindow.location.href).toBe('');
  });

  it('5. attachment usa la misma estrategia (caller pide disposition)', async () => {
    const fetchUrl = jasmine.createSpy('fetchUrl').and.resolveTo('https://signed.example/att');
    const result = await openSignedPdfInNewTab(fetchUrl);
    expect(result.ok).toBeTrue();
    expect(fakeWindow.location.href).toContain('signed.example');
  });

  it('6. no persiste la URL en storage', async () => {
    const url = 'https://signed.example/secret-token';
    await openSignedPdfInNewTab(async () => url);

    expect(JSON.stringify(localStorage)).not.toContain('secret-token');
    expect(JSON.stringify(sessionStorage)).not.toContain('secret-token');
    expect(localStorage.getItem('receta_pdf_url')).toBeNull();
  });

  it('7. solicita URL nueva en cada clic', async () => {
    const fetchUrl = jasmine
      .createSpy('fetchUrl')
      .and.returnValues(
        Promise.resolve('https://signed.example/a'),
        Promise.resolve('https://signed.example/b'),
      );

    await openSignedPdfInNewTab(fetchUrl);
    await openSignedPdfInNewTab(fetchUrl);

    expect(fetchUrl).toHaveBeenCalledTimes(2);
    expect(openSpy).toHaveBeenCalledTimes(2);
  });

  it('14. no registra la URL en consola', async () => {
    const logSpy = spyOn(console, 'log');
    const infoSpy = spyOn(console, 'info');
    const debugSpy = spyOn(console, 'debug');
    const url = 'https://signed.example/do-not-log';

    await openSignedPdfInNewTab(async () => url);

    const all = ([] as unknown[])
      .concat(...logSpy.calls.allArgs(), ...infoSpy.calls.allArgs(), ...debugSpy.calls.allArgs())
      .map(String)
      .join(' ');
    expect(all).not.toContain('do-not-log');
    expect(all).not.toContain(url);
  });

  it('cierra pestaña si la URL viene vacía', async () => {
    const result = await openSignedPdfInNewTab(async () => '');
    expect(result.ok).toBeFalse();
    if (!result.ok) expect(result.reason).toBe('empty_url');
    expect(fakeWindow.close).toHaveBeenCalled();
  });
});

describe('buildRecetaVersionHistorial', () => {
  it('8/10. muestra historial y marca versión actual', () => {
    const rows = buildRecetaVersionHistorial({
      versionActual: 3,
      nombreArchivoActual: 'receta-50.pdf',
      fechaActual: '2026-07-21T10:00:00',
    });

    expect(rows.length).toBe(3);
    expect(rows[0].numero_version).toBe(3);
    expect(rows[0].es_actual).toBeTrue();
    expect(rows[0].tipo_guardado).toBe('ACTUALIZACION');
    expect(rows[0].nombre_archivo).toBe('receta-50.pdf');
    expect(rows[2].numero_version).toBe(1);
    expect(rows[2].tipo_guardado).toBe('CREACION');
    expect(rows[2].es_actual).toBeFalse();
    expect(rows.filter(r => r.es_actual).length).toBe(1);
  });

  it('11. sin PDF / versión 0 no genera filas', () => {
    expect(buildRecetaVersionHistorial({ versionActual: 0 })).toEqual([]);
  });
});
