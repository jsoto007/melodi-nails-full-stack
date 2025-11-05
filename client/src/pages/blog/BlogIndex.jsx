import { Link } from 'react-router-dom';

export default function BlogIndex() {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
          Insights
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          Welcome to the Black Ink Blog
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-gray-600 dark:text-gray-300">
          We created this space to share detailed guidance, tips, and answers to the questions we hear most often in
          the studio. Explore the posts below to learn how to care for your new tattoo and get ready for your next
          session.
        </p>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        <BlogPreview
          title="Tattoo Aftercare Guide"
          description="Step-by-step instructions to help your tattoo heal beautifully, plus our recommended products."
          to="aftercare"
        />
        <BlogPreview
          title="Frequently Asked Questions"
          description="Clear, friendly answers to the most common questions we receive from clients."
          to="faq"
        />
      </div>
    </article>
  );
}

function BlogPreview({ title, description, to }) {
  return (
    <Link
      to={to}
      className="block rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-gray-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:border-gray-800 dark:bg-zinc-950 dark:hover:border-gray-700 dark:hover:bg-zinc-900"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Featured</p>
      <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{description}</p>
      <span className="mt-4 inline-flex items-center text-sm font-medium text-black transition hover:underline dark:text-gray-100">
        Read more →
      </span>
    </Link>
  );
}
