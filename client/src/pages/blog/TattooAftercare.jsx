import { useLanguage } from '../../contexts/LanguageContext.jsx';

export default function TattooAftercare() {
  const { t } = useLanguage();
  const copy = t('blog.aftercare');
  return (
    <article className="space-y-10 text-base leading-relaxed text-gray-600">
      <header>
        <p className="tracking-[0.3em] text-xs font-semibold uppercase text-gray-500">
          {copy.eyebrow}
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-gray-900">
          {copy.title}
        </h1>
        <p className="mt-4 text-base text-gray-600">
          {copy.intro}
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900">{copy.habitsTitle}</h2>
        <p>{copy.habitsIntro}</p>
        <ol className="list-decimal space-y-3 pl-6">
          {copy.habits.map((habit) => (
            <li key={habit} className="pl-1">
              {habit}
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900">{copy.expectTitle}</h2>
        <p>{copy.expectOne}</p>
        <p>{copy.expectTwo}</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900">{copy.productsTitle}</h2>
        <ul className="space-y-3">
          {copy.products.map((product) => (
            <li key={product.label} className="flex flex-col gap-1">
              {product.label}
              <span>&ndash; {product.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900">{copy.reachTitle}</h2>
        <p>
          {copy.reach} {copy.emailUs}{' '}
          <a href="mailto:nailsmelodi@gmail.com">nailsmelodi@gmail.com</a>.
        </p>
      </section>
    </article>
  );
}
