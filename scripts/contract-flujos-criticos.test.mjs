import test from 'node:test';
import assert from 'node:assert/strict';

const API_BASE = process.env.AGENDIFY_API_BASE ?? 'http://localhost:8080/api';
const TEST_USER = process.env.AGENDIFY_TEST_USER;
const TEST_PASSWORD = process.env.AGENDIFY_TEST_PASSWORD;
const AUTH_TEST_REQUIRED =
  process.env.AGENDIFY_REQUIRE_AUTH_TEST === 'true' || process.env.CI === 'true';

function buildUrlFromBase(base, path) {
  const normalizedBase = base.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function getBaseCandidates() {
  const normalized = API_BASE.replace(/\/+$/, '');
  const candidates = [normalized];

  if (normalized.endsWith('/api')) {
    candidates.push(normalized.slice(0, -4));
  } else {
    candidates.push(`${normalized}/api`);
  }

  return [...new Set(candidates)];
}

async function detectAuthBase() {
  const candidates = getBaseCandidates();

  for (const base of candidates) {
    const response = await fetch(buildUrlFromBase(base, '/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: '__usuario_invalido__', contrasena: '__invalida__' }),
    });

    if (response.status !== 404) {
      return { base, status: response.status };
    }
  }

  return { base: candidates[0], status: 404 };
}

test('BE expone auth/login y responde con error controlado ante credenciales invalidas', async () => {
  const detection = await detectAuthBase();

  assert.ok(
    [400, 401, 422].includes(detection.status),
    `Se esperaba 400/401/422 y se recibio ${detection.status} en ${detection.base}/auth/login`,
  );
});

test('Endpoints protegidos rechazan requests sin bearer token', async () => {
  const detection = await detectAuthBase();
  const response = await fetch(buildUrlFromBase(detection.base, '/auth/me'), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  assert.ok(
    [401, 403].includes(response.status),
    `Se esperaba 401/403 y se recibio ${response.status}`,
  );
});

test('Flujo critico auth + sesiones paginadas (requiere AGENDIFY_TEST_USER/PASSWORD)', async (t) => {
  if (!TEST_USER || !TEST_PASSWORD) {
    if (AUTH_TEST_REQUIRED) {
      assert.fail(
        'El test autenticado es obligatorio, pero faltan AGENDIFY_TEST_USER y/o AGENDIFY_TEST_PASSWORD.',
      );
    }

    t.skip('Sin credenciales de prueba. Define AGENDIFY_TEST_USER y AGENDIFY_TEST_PASSWORD.');
    return;
  }

  const detection = await detectAuthBase();
  const authBase = detection.base;

  async function authRequest(path, options = {}) {
    const response = await fetch(buildUrlFromBase(authBase, path), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
    });

    let body = null;
    const text = await response.text();
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }

    return { response, body };
  }

  const login = await authRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ usuario: TEST_USER, contrasena: TEST_PASSWORD }),
  });

  assert.equal(login.response.status, 200, `Login fallo con status ${login.response.status}`);
  assert.equal(typeof login.body?.access_token, 'string', 'access_token ausente en login');
  assert.equal(typeof login.body?.refresh_token, 'string', 'refresh_token ausente en login');

  const accessToken = login.body.access_token;
  const refreshToken = login.body.refresh_token;

  const me = await authRequest('/auth/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  assert.equal(me.response.status, 200, `GET /auth/me fallo con status ${me.response.status}`);
  assert.equal(typeof me.body, 'object', 'GET /auth/me no retorno objeto JSON');

  const refresh = await authRequest('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  assert.equal(refresh.response.status, 200, `Refresh fallo con status ${refresh.response.status}`);
  assert.equal(typeof refresh.body?.access_token, 'string', 'access_token ausente en refresh');
  assert.equal(typeof refresh.body?.refresh_token, 'string', 'refresh_token ausente en refresh');

  const sesiones = await authRequest('/sesiones?page=0&size=5&sort=fecha_sesion,desc', {
    method: 'GET',
    headers: { Authorization: `Bearer ${refresh.body.access_token}` },
  });

  assert.equal(sesiones.response.status, 200, `GET /sesiones fallo con status ${sesiones.response.status}`);
  assert.ok(Array.isArray(sesiones.body?.content), 'Page<SesionDto> sin content[]');
  assert.equal(typeof sesiones.body?.number, 'number', 'Page<SesionDto> sin number');
  assert.equal(typeof sesiones.body?.size, 'number', 'Page<SesionDto> sin size');

  const logout = await authRequest('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refresh.body.refresh_token }),
  });

  assert.ok(
    [200, 204].includes(logout.response.status),
    `Logout retorno status inesperado ${logout.response.status}`,
  );
});
