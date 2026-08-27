import React, { useState } from 'react';

/**
 * SafeImage — an <img> that gracefully falls back to a branded SVG
 * placeholder (instead of a broken-image icon) if the real file at
 * `src` doesn't exist yet. Used everywhere the app renders a
 * database-referenced image (aircraft, airport, community photos)
 * so missing assets never look broken — see public/images/README.md
 * for where to drop real files.
 *
 * `kind` selects which placeholder to show: 'aircraft' | 'airport' | 'photo'.
 */
const PLACEHOLDERS = {
  aircraft: '/images/placeholders/aircraft-placeholder.svg',
  airport: '/images/placeholders/airport-placeholder.svg',
  photo: '/images/placeholders/photo-placeholder.svg',
};

export default function SafeImage({ src, alt, kind = 'aircraft', className, style, loading = 'lazy' }) {
  const fallback = PLACEHOLDERS[kind] || PLACEHOLDERS.aircraft;
  const [current, setCurrent] = useState(src || fallback);

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
