import React, { useEffect, useState } from 'react';

/**
 * SafeImage renders a local/public image when available and falls back to a
 * branded placeholder when it is not.
 *
 * `fallbackSrc` can provide a remote image that should be tried before the
 * branded placeholder. This lets seeded records keep lightweight local paths
 * while the UI still has a real photo when those local assets are absent.
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

export default function SafeImage({
  src,
  fallbackSrc = null,
  alt,
  kind = 'aircraft',
  className,
  style,
  loading = 'lazy',
}) {
  const placeholder = PLACEHOLDERS[kind] || PLACEHOLDERS.aircraft;
  const primary = normalizeSrc(src, fallbackSrc || placeholder);
  const secondary = fallbackSrc ? normalizeSrc(fallbackSrc, placeholder) : null;
  const [current, setCurrent] = useState(primary);

  useEffect(() => {
    setCurrent(primary);
  }, [primary]);

  return (
    <img
      src={current}
      alt={alt || ''}
      loading={loading}
      className={className}
      style={style}
      onError={() => {
        if (secondary && current !== secondary && secondary !== placeholder) {
          setCurrent(secondary);
          return;
        }
        if (current !== placeholder) setCurrent(placeholder);
      }}
    />
  );
}
