import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

export default function BlogIndex() {
  const { t } = useLanguage();
  const copy = t('blog.index');
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
          {copy.eyebrow}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
          {copy.title}
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-gray-600">
          {copy.description}
        </p>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        {copy.posts.map((post) => (
          <BlogPreview key={post.to} {...post} featured={copy.featured} readMore={copy.readMore} />
        ))}
      </div>
    </article>
  );
}

function BlogPreview({ title, description, to, featured, readMore }) {
  return (
    <Link
      to={to}
      className="block rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-gray-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">{featured}</p>
      <h2 className="mt-4 text-xl font-semibold text-gray-900">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">{description}</p>
      <span className="mt-4 inline-flex items-center text-sm font-medium text-black transition hover:underline">
        {readMore}
      </span>
    </Link>
  );
}
