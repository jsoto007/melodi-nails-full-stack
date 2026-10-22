import { useLanguage } from '../contexts/LanguageContext.jsx';

// EN / ES pill switch shared by the footer and the client portal header.
export default function LanguageToggle({ className = '' }) {
  const { language, setLanguage, t } = useLanguage();

  const option = (code) => (
    <button
      key={code}
      type="button"
      onClick={() => setLanguage(code)}
      className={`rounded-full px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] transition ${
        language === code ? 'bg-[#c8af8f] text-[#243020]' : 'text-[#5e6755]'
      }`}
      aria-pressed={language === code}
      lang={code}
      title={t(`common.language.${code}`)}
    >
      {code.toUpperCase()}
    </button>
  );

  return (
    <div
      role="group"
      aria-label={t('common.language.label')}
      className={`inline-flex items-center rounded-full border border-[#c8af8f]/60 bg-white/70 p-1 shadow-[0_8px_24px_rgba(42,57,35,0.06)] ${className}`}
    >
      {option('en')}
      {option('es')}
    </div>
  );
}
