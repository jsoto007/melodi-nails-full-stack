import { NavLink, Outlet } from 'react-router-dom';

const POSTS = [
  { slug: 'aftercare', title: 'Tattoo Aftercare Guide' },
  { slug: 'faq', title: 'Frequently Asked Questions' }
];

export default function BlogLayout() {
  return (
    <main className="bg-gray-50 text-gray-900 dark:bg-zinc-950 dark:text-gray-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-16 lg:flex-row">
        <aside className="lg:w-72">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
            Blog
          </p>
          <nav className="mt-6 space-y-3">
            {POSTS.map((post) => (
              <NavLink
                key={post.slug}
                to={post.slug}
                end
                className={({ isActive }) =>
                  [
                    'block rounded-lg border px-4 py-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                    isActive
                      ? 'border-black bg-black text-white dark:border-gray-100 dark:bg-gray-100 dark:text-black'
                      : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-100 dark:border-gray-800 dark:bg-black dark:text-gray-200 dark:hover:border-gray-700 dark:hover:bg-zinc-900'
                  ].join(' ')
                }
              >
                {post.title}
              </NavLink>
            ))}
          </nav>
        </aside>
        <section className="flex-1">
          <Outlet />
        </section>
      </div>
    </main>
  );
}
