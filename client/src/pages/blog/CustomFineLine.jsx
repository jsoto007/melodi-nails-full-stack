import { useLanguage } from '../../contexts/LanguageContext.jsx';

export default function CustomFineLine() {
  const { t } = useLanguage();
  const copy = t('blog.signatureSet');
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

      {copy.sections.map((section, index) => (
        <section key={section.title} className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">{section.title}</h2>
          <p>{section.body}</p>
          {index === copy.sections.length - 1 ? <p>{copy.closing}</p> : null}
        </section>
      ))}
    </article>
  );
}
