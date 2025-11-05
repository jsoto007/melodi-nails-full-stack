import { Link } from 'react-router-dom';

const year = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white/80 dark:border-gray-800 dark:bg-black/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 text-sm text-gray-600 dark:text-gray-400 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col items-start gap-1 uppercase tracking-[0.3em] md:flex-row md:items-center md:gap-3">
          <span>© {year} BLACKWORKNYC</span>
          <a
            href="https://sotodev.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-gray-700 underline underline-offset-4 transition hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:text-gray-200 dark:hover:text-gray-100 dark:focus-visible:outline-gray-500"
          >
            Powered by SotoDev, LLC
          </a>
        </div>
        <div className="flex flex-wrap items-start gap-8 text-sm">
          <div className="space-y-2">
            <Link
              to="/blog"
              className="block text-xs font-semibold uppercase tracking-[0.3em] text-gray-700 transition hover:text-black dark:text-gray-200 dark:hover:text-gray-100"
            >
              Blog
            </Link>
            <div className="flex flex-col gap-1 text-xs tracking-normal text-gray-500 dark:text-gray-400">
              <Link to="/blog/aftercare" className="transition hover:text-black dark:hover:text-gray-100">
                Tattoo Aftercare Guide
              </Link>
              <Link to="/blog/faq" className="transition hover:text-black dark:hover:text-gray-100">
                Frequently Asked Questions
              </Link>
            </div>
          </div>
          <a href="#faq" className="uppercase tracking-[0.2em] transition hover:text-black dark:hover:text-gray-100">
            Policies
          </a>
          <a href="#top" className="uppercase tracking-[0.2em] transition hover:text-black dark:hover:text-gray-100">
            Back to top
          </a>
        </div>
      </div>
    </footer>
  );
}
