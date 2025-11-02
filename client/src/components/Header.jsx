import { Link } from 'react-router-dom';
import Button from './Button.jsx';

const NAV_ITEMS = [
  { label: 'Work', href: '#work' },
  { label: 'Services', href: '#services' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' }
];

export default function Header({ theme, onToggleTheme }) {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-sm dark:border-gray-800 dark:bg-black/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-sm font-semibold uppercase tracking-[0.5em] text-gray-900 dark:text-gray-100">
          BLACK INK TATTOO
        </Link>
        <nav className="hidden items-center gap-8 text-xs font-semibold uppercase tracking-[0.3em] md:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-gray-600 transition-colors hover:text-black focus:outline-none focus-visible:underline dark:text-gray-400 dark:hover:text-gray-100"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:border-gray-900 hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-300 dark:hover:text-white dark:focus-visible:ring-gray-600 dark:focus-visible:ring-offset-black"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 3.5a1 1 0 01-.92-.6 1 1 0 011.47-1.2 9 9 0 109.15 15.08 1 1 0 011.15 1.63A11 11 0 0112 3.5z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M12 2v2m0 16v2m10-10h-2M6 12H4m15.07-6.07l-1.42 1.42M6.35 17.65l-1.42 1.42m0-12.02l1.42 1.42m11.3 11.3l1.42 1.42"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
          <Button as={Link} to="/auth" variant="secondary">
            Sign In
          </Button>
          <Button as="a" href="#booking" className="hidden md:inline-flex">
            Book Consult
          </Button>
        </div>
      </div>
    </header>
  );
}
