import { useEffect, useMemo, useState } from 'react';

function formatCurrency(amountCents, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format((amountCents || 0) / 100);
}

function formatDuration(minutes) {
  if (!minutes) return 'TBD';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  const parts = [];
  if (hours) parts.push(`${hours}h`);
  if (remainder) parts.push(`${remainder}m`);
  return parts.join(' ') || '0m';
}

// Mirrors the server's rounding (discount rounded half up, in integer cents).
export function discountedPriceCents(priceCents, percent) {
  const price = Math.max(0, Number(priceCents) || 0);
  const pct = Math.max(0, Math.min(100, Number(percent) || 0));
  if (!pct) return price;
  return Math.max(0, price - Math.floor((price * pct + 50) / 100));
}

// Group on the same normalised key the server uses ("Manicura" and "manicura " are one
// category); the first spelling seen is the one displayed.
function groupByCategory(products) {
  const map = new Map();
  for (const product of products) {
    const label = (product.category || 'Otros').trim() || 'Otros';
    const key = label.toLowerCase();
    if (!map.has(key)) map.set(key, { label, items: [] });
    map.get(key).items.push(product);
  }
  return new Map(Array.from(map.values()).map(({ label, items }) => [label, items]));
}

function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

/**
 * Categories collapse to one row each (count + "from" price, or the chosen service);
 * tapping a row reveals its services. One service per category — picking another
 * replaces it. With `discountPercent`, prices show the list price struck through.
 */
export default function ServiceAccordionPicker({
  products,
  selectedIds,
  onSelect,
  onRemove,
  currency = 'USD',
  discountPercent = 0,
  emptyMessage = 'No services available right now.',
}) {
  const groups = useMemo(() => Array.from(groupByCategory(products).entries()), [products]);
  const selectedSet = useMemo(() => new Set(selectedIds.map((id) => String(id))), [selectedIds]);
  const [expanded, setExpanded] = useState(null);

  // Open the first category on arrival so the picker never looks empty.
  useEffect(() => {
    if (expanded === null && groups.length) setExpanded(groups[0][0]);
  }, [groups, expanded]);

  if (!groups.length) {
    return (
      <p className="rounded-xl border border-dashed border-[#d9cbbc] bg-white/60 px-4 py-6 text-center text-sm text-[#6f7863]">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="divide-y divide-[#ede5d8] overflow-hidden rounded-2xl border border-[#d9cbbc] bg-white">
      {groups.map(([category, items]) => {
        const isOpen = expanded === category;
        const chosen = items.find((product) => selectedSet.has(String(product.id))) || null;
        const fromCents = Math.min(...items.map((product) => discountedPriceCents(product.price_cents, discountPercent)));
        const panelId = `category-${category.replace(/\s+/g, '-').toLowerCase()}`;
        return (
          <div key={category}>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setExpanded(isOpen ? null : category)}
              className={`flex w-full items-center gap-3 px-4 py-4 text-left transition ${isOpen ? 'bg-[#f6f2ec]' : 'hover:bg-[#faf7f2]'}`}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[#2a3923]">{category}</span>
                <span className="block truncate text-xs text-[#6f7863]">
                  {chosen
                    ? `${chosen.name} · ${formatCurrency(discountedPriceCents(chosen.price_cents, discountPercent), currency)}`
                    : `${items.length} ${items.length === 1 ? 'servicio' : 'servicios'} · desde ${formatCurrency(fromCents, currency)}`}
                </span>
              </span>
              {chosen ? (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2a3923] text-white">
                  <CheckIcon />
                </span>
              ) : null}
              <svg
                className={`h-4 w-4 shrink-0 text-[#6f7863] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {isOpen ? (
              <div id={panelId} className="space-y-2 bg-[#f6f2ec] px-3 pb-3">
                {items.map((product) => {
                  const selected = selectedSet.has(String(product.id));
                  const listPrice = Number(product.price_cents) || 0;
                  const price = discountedPriceCents(listPrice, discountPercent);
                  return (
                    <div
                      key={product.id}
                      className={`flex items-start gap-3 rounded-xl border bg-white p-3.5 transition ${
                        selected ? 'border-2 border-[#2a3923] shadow-sm' : 'border-[#d9cbbc]'
                      }`}
                    >
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => (selected ? onRemove(product.id) : onSelect(product))}
                        className="min-w-0 flex-1 text-left"
                      >
                        {product.tagline ? (
                          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8a7355]">{product.tagline}</p>
                        ) : null}
                        <p className="text-sm font-semibold text-slate-900">{product.name || `Servicio ${product.id}`}</p>
                        {product.description ? (
                          <p className="mt-1 text-xs leading-relaxed text-[#6f7863]">{product.description}</p>
                        ) : null}
                        <p className="mt-1.5 text-xs text-[#5e6755]">
                          {formatDuration(product.duration_minutes)} ·{' '}
                          {discountPercent ? (
                            <>
                              <span className="line-through">{formatCurrency(listPrice, currency)}</span>{' '}
                              <span className="font-semibold text-[#2a3923]">{formatCurrency(price, currency)}</span>
                            </>
                          ) : (
                            <span className="font-semibold text-[#2a3923]">{formatCurrency(price, currency)}</span>
                          )}
                        </p>
                      </button>
                      <button
                        type="button"
                        aria-label={selected ? `Quitar ${product.name}` : `Añadir ${product.name}`}
                        onClick={() => (selected ? onRemove(product.id) : onSelect(product))}
                        className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition ${
                          selected ? 'bg-[#2a3923] text-white' : 'border border-[#d9cbbc] text-[#2a3923] hover:border-[#2a3923]'
                        }`}
                      >
                        {selected ? (
                          <CheckIcon />
                        ) : (
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
