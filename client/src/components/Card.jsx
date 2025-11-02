function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const baseClasses =
  'rounded-2xl border border-gray-200 bg-white/90 p-8 shadow-soft backdrop-blur-sm transition dark:border-gray-800 dark:bg-gray-950/80';

export default function Card({ className = '', children, ...props }) {
  return (
    <div className={classNames(baseClasses, className)} {...props}>
      {children}
    </div>
  );
}
