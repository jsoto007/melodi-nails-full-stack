import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// Keeps SPA navigation aligned with user expectations by forcing a scroll-to-top
// whenever the active route changes.
export default function ScrollRestoration({ behavior = 'smooth' }) {
  const location = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      const { scrollRestoration } = window.history;
      window.history.scrollRestoration = 'manual';
      return () => {
        window.history.scrollRestoration = scrollRestoration;
      };
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const hash = (location.hash || '').replace(/^#/, '');
    if (hash) {
      const scrollToHash = () => {
        const target = document.getElementById(hash);
        if (!target) {
          return false;
        }
        target.scrollIntoView({ behavior });
        return true;
      };

      if (!scrollToHash()) {
        requestAnimationFrame(() => {
          if (!scrollToHash()) {
            window.scrollTo({ top: 0, left: 0, behavior });
          }
        });
      }
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior });
    const topAnchor = document.getElementById('top');
    if (topAnchor && typeof topAnchor.focus === 'function') {
      topAnchor.focus({ preventScroll: true });
    }
  }, [behavior, location.pathname, location.search, location.hash]);

  return null;
}
