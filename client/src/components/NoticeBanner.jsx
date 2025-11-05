import { useEffect } from 'react';

const TONE_STYLES = {
  success:
    'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950/60 dark:text-green-300',
  error: 'border-red-300 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-950/60 dark:text-red-300',
  warning:
    'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-950/60 dark:text-amber-300',
  info: 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-600 dark:bg-sky-950/60 dark:text-sky-300'
};

function IconX(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M6 6l8 8M14 6l-8 8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function NoticeBanner({ tone = 'info', message, onDismiss, autoHideAfter = 6000 }) {
  useEffect(() => {
    if (!autoHideAfter) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      onDismiss?.();
    }, autoHideAfter);
    return () => window.clearTimeout(timer);
  }, [autoHideAfter, onDismiss]);

  if (!message) {
    return null;
  }

  const toneClass = TONE_STYLES[tone] ?? TONE_STYLES.info;

  return (
    <div
      className={`flex items-start justify-between gap-4 rounded-2xl border px-4 py-3 text-sm shadow-sm ${toneClass}`}
      role="status"
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
    >
      <p className="flex-1 leading-relaxed">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs uppercase tracking-[0.3em] transition hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:hover:bg-white/10"
        aria-label="Dismiss notification"
      >
        <IconX className="h-4 w-4" />
      </button>
    </div>
  );
}
