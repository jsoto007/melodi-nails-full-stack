// Fails when a translation key exists in one language but not the other, or a
// Spanish value is left identical to a long English sentence (likely untranslated).
import { readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/i18n/messages');
const problems = [];

function shape(value) {
  if (typeof value === 'function') return 'fn';
  if (Array.isArray(value)) return `array:${value.length}`;
  if (value && typeof value === 'object') return 'object';
  return typeof value;
}

function compare(en, es, trail) {
  const keys = new Set([...Object.keys(en || {}), ...Object.keys(es || {})]);
  for (const key of keys) {
    const where = `${trail}.${key}`;
    if (!(key in (en || {}))) { problems.push(`${where}: missing in en`); continue; }
    if (!(key in (es || {}))) { problems.push(`${where}: missing in es`); continue; }
    const a = en[key];
    const b = es[key];
    if (shape(a) !== shape(b)) { problems.push(`${where}: en is ${shape(a)}, es is ${shape(b)}`); continue; }
    if (a && typeof a === 'object') compare(a, b, where);
    else if (typeof a === 'string' && a === b && a.split(' ').length > 3) {
      problems.push(`${where}: es identical to en ("${a.slice(0, 40)}…")`);
    }
  }
}

for (const file of readdirSync(dir).filter((f) => f.endsWith('.js')).sort()) {
  const mod = await import(pathToFileURL(path.join(dir, file)).href);
  const { en, es } = mod.default || {};
  if (!en || !es) { problems.push(`${file}: must export default { en, es }`); continue; }
  compare(en, es, file.replace(/\.js$/, ''));
}

if (problems.length) {
  console.error(`i18n check failed (${problems.length}):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('i18n check passed');
