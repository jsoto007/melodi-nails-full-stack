import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiGet } from '../lib/api.js';

function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, '-');
}

const GalleryContext = createContext(null);

export function GalleryProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [activeSlug, setActiveSlug] = useState('');
  const [galleryBySlug, setGalleryBySlug] = useState({});
  const [messagesBySlug, setMessagesBySlug] = useState({});
  const [statusBySlug, setStatusBySlug] = useState({});
  const [initializing, setInitializing] = useState(true);
  const [globalMessage, setGlobalMessage] = useState(null);

  const statusRef = useRef(statusBySlug);
  useEffect(() => {
    statusRef.current = statusBySlug;
  }, [statusBySlug]);

  const activeSlugRef = useRef(activeSlug);
  useEffect(() => {
    activeSlugRef.current = activeSlug;
  }, [activeSlug]);

  const clearCategoryMessage = useCallback((slug) => {
    setMessagesBySlug((prev) => {
      if (!prev[slug]) {
        return prev;
      }
      const next = { ...prev };
      delete next[slug];
      return next;
    });
  }, []);

  const fetchCategoryItems = useCallback(
    async (category, { signal, force = false } = {}) => {
      if (!category) {
        return;
      }
      const slug = category.slug;
      const currentStatus = statusRef.current?.[slug];

      if (!force) {
        if (currentStatus?.loading) {
          return;
        }
        if (currentStatus?.loaded) {
          return;
        }
      }

      setStatusBySlug((prev) => ({
        ...prev,
        [slug]: { ...(prev[slug] ?? {}), loading: true, error: false }
      }));
      clearCategoryMessage(slug);

      try {
        const queryParam = category.id ? `category_id=${category.id}` : `category=${slug}`;
        const data = await apiGet(`/api/gallery?${queryParam}`, { signal });
        if (signal?.aborted) {
          setStatusBySlug((prev) => ({
            ...prev,
            [slug]: { ...(prev[slug] ?? {}), loading: false }
          }));
          return;
        }

        const normalized = Array.isArray(data)
          ? data.map((item) => ({
              id: item.id,
              image_url: item.image_url,
              alt: item.alt,
              caption: item.caption,
              category_name: item.category?.name || category.name,
              category_slug: slug
            }))
          : [];

        setGalleryBySlug((prev) => ({
          ...prev,
          [slug]: normalized
        }));
        setMessagesBySlug((prev) => {
          const next = { ...prev };
          if (normalized.length) {
            delete next[slug];
          } else {
            next[slug] = 'No artwork published yet.';
          }
          return next;
        });
        setStatusBySlug((prev) => ({
          ...prev,
          [slug]: { loading: false, loaded: true, error: false }
        }));
      } catch (error) {
        if (signal?.aborted || error.name === 'AbortError') {
          setStatusBySlug((prev) => ({
            ...prev,
            [slug]: { ...(prev[slug] ?? {}), loading: false }
          }));
          return;
        }

        setMessagesBySlug((prev) => ({
          ...prev,
          [slug]: 'Unable to load this gallery right now.'
        }));
        setStatusBySlug((prev) => ({
          ...prev,
          [slug]: { loading: false, loaded: false, error: true }
        }));
      }
    },
    [clearCategoryMessage]
  );

  useEffect(() => {
    setStatusBySlug((prev) => {
      let changed = false;
      const next = { ...prev };
      categories.forEach((category) => {
        if (!next[category.slug]) {
          next[category.slug] = { loading: false, loaded: false, error: false };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [categories]);

  useEffect(() => {
    setGalleryBySlug((prev) => {
      let changed = false;
      const next = { ...prev };
      categories.forEach((category) => {
        if (!next[category.slug]) {
          next[category.slug] = [];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [categories]);

  useEffect(() => {
    if (!categories.length) {
      setActiveSlug('');
      return;
    }
    const currentActive = activeSlugRef.current;
    if (!categories.some((category) => category.slug === currentActive)) {
      setActiveSlug(categories[0].slug);
    }
  }, [categories]);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function bootstrap() {
      setInitializing(true);
      try {
        const data = await apiGet('/api/gallery/categories', { signal: controller.signal });
        if (ignore) {
          return;
        }

        if (Array.isArray(data) && data.length) {
          const nextCategories = data.map((category) => {
            const slug = slugify(category.name);
            return {
              id: category.id,
              slug,
              name: category.name
            };
          });

          setCategories(nextCategories);
          setGlobalMessage(null);

          const currentActive = activeSlugRef.current;
          const nextActive = nextCategories.find((category) => category.slug === currentActive)
            ? currentActive
            : nextCategories[0]?.slug ?? '';
          setActiveSlug(nextActive);

          await Promise.all(
            nextCategories.map((category) =>
              fetchCategoryItems(category, { signal: controller.signal, force: true })
            )
          );
        } else {
          setCategories([]);
          setGlobalMessage('No gallery categories available yet.');
        }
      } catch (error) {
        if (!ignore && error.name !== 'AbortError') {
          setGlobalMessage('Unable to load gallery right now.');
        }
      } finally {
        if (!ignore) {
          setInitializing(false);
        }
      }
    }

    bootstrap();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [fetchCategoryItems]);

  const selectCategory = useCallback(
    (slug) => {
      if (!slug || slug === activeSlugRef.current) {
        return;
      }
      const category = categories.find((item) => item.slug === slug);
      if (!category) {
        return;
      }
      setActiveSlug(slug);
      fetchCategoryItems(category);
    },
    [categories, fetchCategoryItems]
  );

  const value = useMemo(
    () => ({
      categories,
      galleryBySlug,
      messagesBySlug,
      statusBySlug,
      activeSlug,
      initializing,
      globalMessage,
      selectCategory
    }),
    [
      categories,
      galleryBySlug,
      messagesBySlug,
      statusBySlug,
      activeSlug,
      initializing,
      globalMessage,
      selectCategory
    ]
  );

  return <GalleryContext.Provider value={value}>{children}</GalleryContext.Provider>;
}

export function useGallery() {
  const context = useContext(GalleryContext);
  if (!context) {
    throw new Error('useGallery must be used within a GalleryProvider');
  }
  return context;
}
