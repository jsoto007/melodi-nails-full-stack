import { useLanguage } from '../../contexts/LanguageContext.jsx';

export default function TattooFaq() {
  const { t } = useLanguage();
  const copy = t('blog.faq');
  return (
    <article className="space-y-10 text-base leading-relaxed text-gray-600">
      <header>
        <p className="tracking-[0.3em] text-xs font-semibold uppercase text-gray-500">{copy.eyebrow}</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-gray-900">
          {copy.title}
        </h1>
        <p className="mt-4 max-w-3xl">
          {copy.intro}
        </p>
      </header>

      <section className="space-y-6">
        {copy.questions.map((item) => (
          <Question key={item.question} question={item.question} answer={item.answer} />
        ))}
      </section>

      <footer>
        <p>
          {copy.footerBefore}{' '}
          <a className="font-medium text-black underline" href="mailto:nailsmelodi@gmail.com">
            nailsmelodi@gmail.com
          </a>{' '}
          {copy.footerAfter}
        </p>
      </footer>
    </article>
  );
}

function Question({ question, answer }) {
  return (
    <div className="space-y-2">
      <h2 className="text-2xl font-semibold text-gray-900">{question}</h2>
      <p>{answer}</p>
    </div>
  );
}
