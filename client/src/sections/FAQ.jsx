import FadeIn from '../components/FadeIn.jsx';
import Card from '../components/Card.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';

export default function FAQ() {
  const { t } = useLanguage();
  const faqs = t('public.faq.items');
  const copy = {
    eyebrow: t('public.faq.eyebrow'),
    title: t('public.faq.title'),
    description: t('public.faq.description'),
  };
  return (
    <section id="faq" className="bg-[#ECE7E2] py-16 text-[#23301d]">
      <FadeIn className="mx-auto flex max-w-6xl flex-col gap-12 px-6" delayStep={0.18}>
        <SectionTitle
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.description}
        />
        <FadeIn className="space-y-6" delayStep={0.12}>
          {faqs.map((faq) => (
            <Card key={faq.id} className="space-y-3">
              <h3 className="text-base font-semibold tracking-[0.08em] text-[#2a3923]">{faq.question}</h3>
              <p className="text-sm text-[#5e6755]">{faq.answer}</p>
            </Card>
          ))}
        </FadeIn>
      </FadeIn>
    </section>
  );
}
