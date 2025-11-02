function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function SectionTitle({ eyebrow, title, description, align = 'left' }) {
  const alignment = align === 'center' ? 'text-center' : 'text-left';
  const wrapper = align === 'center' ? 'mx-auto' : '';

  return (
    <div className={classNames('max-w-3xl', wrapper, alignment)}>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-gray-400">{eyebrow}</p>
      ) : null}
      <h2 className="mt-4 text-3xl font-semibold uppercase tracking-[0.2em] text-gray-900 dark:text-gray-100">{title}</h2>
      {description ? <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">{description}</p> : null}
    </div>
  );
}
