// The service catalogue lives in the database in Spanish. English mode looks
// each service up here by its Spanish name. A service added later in admin
// shows its Spanish text in English mode until it is added to this list.
const SERVICES_EN = {
  'manicura rusa': {
    name: 'Russian Manicure',
    tagline: 'Clean finish',
    description:
      'Dry manicure focused on detailed cuticle work and skin refinement, finished with gel polish and calcium gel for a natural, polished look.',
  },
  'uñas con pintura en gel': {
    name: 'Gel Polish Nails',
    tagline: 'Long-lasting color',
    description:
      'Clear acrylic nails finished with gel polish in the shade of your choice for a glossy, long-lasting finish.',
  },
  'acrílico de color': {
    name: 'Color Acrylic Set',
    tagline: 'Bold color',
    description:
      'Full acrylic set in the color of your choice for durable, eye-catching nails shaped to the length and shape you prefer.',
  },
  'retoque en acrílico de color': {
    name: 'Color Acrylic Fill',
    tagline: 'Color refresh',
    description:
      'Color acrylic fill on the grown-out area to keep your nails looking perfect without a full new set.',
  },
  'retoque de acrílico cristal': {
    name: 'Clear Acrylic Fill',
    tagline: 'Crystal refresh',
    description:
      'Clear acrylic fill with gel polish to keep the shine and structure of your nails between visits.',
  },
  'baby boomer': {
    name: 'Baby Boomer',
    tagline: 'Soft ombré',
    description:
      'Two-tone acrylic ombré for a soft, elegant, always photo-ready look. Perfect if you want a timeless style.',
  },
  'french perfecto': {
    name: 'Perfect French',
    tagline: 'Signature detail',
    description:
      'Precise French finish over a structured acrylic base, ideal for clean lines and a timeless set that always looks flawless.',
  },
  'acrílico de color + french': {
    name: 'Color Acrylic + French',
    tagline: 'Color meets French',
    description:
      'Color acrylic with gel French tips for an elegant double-impact finish that combines color with the classic French style.',
  },
  'pedicura en gel': {
    name: 'Gel Pedicure',
    tagline: 'Gentle care',
    description:
      'Nail and foot cleanup, exfoliation, hydration, and long-lasting gel color in the shade you prefer.',
  },
  'derretido de uñas acrílicas': {
    name: 'Acrylic Removal',
    tagline: 'Safe removal',
    description:
      'Acrylic removal with pure acetone and warm water for a clean, safe process with no damage to the natural nail.',
  },
  'tratamiento de parafina': {
    name: 'Paraffin Treatment',
    tagline: 'Extra hydration',
    description:
      'Warm paraffin treatment for hands or feet that adds hydration and comfort and boosts circulation as an add-on to your visit.',
  },
};

const CATEGORIES_EN = {
  manicura: 'Manicure',
  retoques: 'Fills',
  'diseños premium': 'Premium Designs',
  pedicura: 'Pedicure',
  tratamientos: 'Treatments',
  otros: 'Other',
};

const FIELDS = ['name', 'tagline', 'description', 'category'];

function key(value) {
  return String(value || '').trim().toLowerCase();
}

function englishName(spanish) {
  const direct = SERVICES_EN[key(spanish)]?.name;
  if (direct) return direct;
  // Combined labels such as "Manicura Rusa + Pedicura en Gel".
  if (spanish.includes(' + ')) {
    const parts = spanish.split(' + ');
    const translated = parts.map((part) => SERVICES_EN[key(part)]?.name);
    if (translated.every(Boolean)) return translated.join(' + ');
  }
  return '';
}

export function localizedServiceField(option, field, language) {
  if (!option) return '';
  const spanish = option[field] || '';
  if (language !== 'en') return spanish;
  if (option[`${field}_en`]) return option[`${field}_en`];
  if (!spanish) return '';
  if (field === 'category') return CATEGORIES_EN[key(spanish)] || spanish;
  if (field === 'name') return englishName(spanish) || spanish;
  return SERVICES_EN[key(option.name)]?.[field] || spanish;
}

export function localizeService(option, language) {
  if (!option) return option;
  const localized = { ...option };
  for (const field of FIELDS) {
    localized[field] = localizedServiceField(option, field, language);
  }
  return localized;
}
