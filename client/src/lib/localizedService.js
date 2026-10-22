// Service catalogue text is stored in Spanish (`name`, `tagline`, ...) with
// optional English columns (`name_en`, ...). Pick the right one for the site
// language, falling back to whatever exists.
const FIELDS = ['name', 'tagline', 'description', 'category'];

export function localizedServiceField(option, field, language) {
  if (!option) return '';
  const spanish = option[field] || '';
  const english = option[`${field}_en`] || '';
  return language === 'en' ? english || spanish : spanish || english;
}

export function localizeService(option, language) {
  if (!option) return option;
  const localized = { ...option };
  for (const field of FIELDS) {
    localized[field] = localizedServiceField(option, field, language);
  }
  return localized;
}
