function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-gray-600 dark:focus-visible:ring-offset-black';
const variants = {
  primary: 'bg-black text-white hover:bg-gray-900 dark:bg-gray-100 dark:text-black dark:hover:bg-gray-200',
  secondary:
    'border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white dark:border-gray-200 dark:text-gray-100 dark:hover:bg-gray-100 dark:hover:text-black',
  ghost: 'text-gray-700 hover:text-black dark:text-gray-300 dark:hover:text-white'
};

export default function Button({ as: Component = 'button', variant = 'primary', className = '', children, ...props }) {
  const variantClasses = variants[variant] || variants.primary;

  return (
    <Component className={classNames(baseClasses, variantClasses, className)} {...props}>
      {children}
    </Component>
  );
}
