/**
 * Normaliza archivos fuente que NO son UTF-8 válido (p. ej. guardados en CP1252/Latin-1).
 * Solo toca rutas bajo src/ con extensiones .html / .ts.
 *
 * Uso:
 *   node scripts/ensure-utf8-sources.mjs
 *   DRY_RUN=1 node scripts/ensure-utf8-sources.mjs   (solo lista, no escribe)
 *
 * No modifica archivos que ya decodifican como UTF-8 estricto.
 * Si un archivo inválido mezcla UTF-8 multibyte real con bytes sueltos, revisar a mano.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcRoot = path.join(root, 'src');

const EXT = /\.(html|ts)$/i;
const DRY = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (['node_modules', 'dist', 'www', '.git'].includes(ent.name)) continue;
      walk(p, acc);
    } else if (EXT.test(ent.name)) acc.push(p);
  }
  return acc;
}

function isStrictUtf8(buf) {
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buf);
    return true;
  } catch {
    return false;
  }
}

/** Interpreta cada byte como carácter Windows-1252 y re-escribe UTF-8. */
function bytesCp1252ToUtf8(buf) {
  const dec = new TextDecoder('windows-1252');
  const s = dec.decode(buf);
  return Buffer.from(s, 'utf8');
}

function bufEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

const files = walk(srcRoot);
let fixed = 0;
let skipped = 0;

for (const abs of files) {
  const buf = fs.readFileSync(abs);
  if (isStrictUtf8(buf)) {
    skipped++;
    continue;
  }
  const out = bytesCp1252ToUtf8(buf);
  if (bufEqual(buf, out)) {
    skipped++;
    continue;
  }
  const rel = path.relative(root, abs);
  if (DRY) {
    console.log(`[dry-run] reescribiría UTF-8: ${rel}`);
    fixed++;
    continue;
  }
  fs.writeFileSync(abs, out);
  console.log(`UTF-8 normalizado: ${rel}`);
  fixed++;
}

console.log(JSON.stringify({ fixed, skipped, dryRun: DRY }, null, 0));
