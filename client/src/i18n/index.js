// Lightweight i18n: every area of the site keeps its copy in
// `messages/<area>.js` as `{ en: {...}, es: {...} }`. Keys must exist in both
// languages — `npm run check:i18n` fails the build otherwise.
const modules = import.meta.glob('./messages/*.js', { eager: true });

const NAMESPACES = Object.fromEntries(
  Object.entries(modules).map(([file, mod]) => [file.replace(/^.*\/(.+)\.js$/, '$1'), mod.default])
);

export const SUPPORTED_LANGUAGES = ['en', 'es'];
export const STUDIO_TIME_ZONE = 'America/New_York';

// The current language for code that runs outside React (API client, helpers).
// LanguageProvider keeps this in sync.
let currentLanguage = 'en';

export function setCurrentLanguage(language) {
  currentLanguage = SUPPORTED_LANGUAGES.includes(language) ? language : 'en';
}

export function getCurrentLanguage() {
  return currentLanguage;
}

function lookup(language, path) {
  const [namespace, ...rest] = path.split('.');
  let node = NAMESPACES[namespace]?.[language];
  for (const part of rest) {
    if (node == null) return undefined;
    node = node[part];
  }
  return node;
}

function interpolate(template, vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    vars[name] === undefined || vars[name] === null ? match : String(vars[name])
  );
}

// translate('auth.signIn', 'es', { name: 'Ana' })
// Values may be strings, arrays/objects (returned as-is), or functions of vars
// (for plurals): `items: ({ count }) => (count === 1 ? '1 item' : `${count} items`)`.
export function translate(path, language = currentLanguage, vars) {
  let value = lookup(language, path);
  if (value === undefined && language !== 'en') {
    value = lookup('en', path);
  }
  if (value === undefined) {
    if (import.meta.env?.DEV) {
      console.warn(`[i18n] missing key: ${path}`);
    }
    return path;
  }
  if (typeof value === 'function') return value(vars || {});
  if (typeof value === 'string') return interpolate(value, vars);
  return value;
}

export function localeFor(language = currentLanguage) {
  return language === 'es' ? 'es-US' : 'en-US';
}
