import React, { useEffect, useState } from 'react';

/**
 * SafeImage renders a local/public image when available and falls back to a
 * branded placeholder when it is not. Database paths such as
 * `images/aircraft/737.jpg` are normalized to `/images/aircraft/737.jpg`.
 */
const PLACEHOLDERS = {
  aircraft: '/images/placeholders/aircraft-placeholder.svg',
  airport: '/images/placeholders/airport-placeholder.svg',
  photo: '/images/placeholders/photo-placeholder.svg',
};

function normalizeSrc(src, fallback) {
  if (!src) return fallback;
  if (/^(https?:)?\/\//i.test(src) || src.startsWith('/')) return src;
  return `/${src}`;
}

export default function SafeImage({ src, alt, kind = 'aircraft', className, style, loading = 'lazy' }) {
  const fallback = PLACEHOLDERS[kind] || PLACEHOLDERS.aircraft;
  const normalized = normalizeSrc(src, fallback);
  const [current, setCurrent] = useState(normalized);

  useEffect(() => {
    setCurrent(normalized);
  }, [normalized]);

  return (
    <img
      src={current}
      alt={alt || ''}
      loading={loading}
      className={className}
      style={style}
      onError={() => {
        if (current !== fallback) setCurrent(fallback);
      }}
    />
  );
}
