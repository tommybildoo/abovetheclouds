import React, { useEffect, useState } from 'react';

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

async function wikipediaThumbnail(alt) {
  if (!alt) return null;
  try {
    const title = encodeURIComponent(alt.trim().replace(/\s+/g, ' '));
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.thumbnail?.source || data?.originalimage?.source || null;
  } catch {
    return null;
  }
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
  const [wikiTried, setWikiTried] = useState(false);

  useEffect(() => {
    setCurrent(primary);
    setWikiTried(false);
  }, [primary]);

  const handleError = async () => {
    if (secondary && current !== secondary && secondary !== placeholder) {
      setCurrent(secondary);
      return;
    }
    if (!wikiTried && alt) {
      setWikiTried(true);
      const remote = await wikipediaThumbnail(alt);
      if (remote) {
        setCurrent(remote);
        return;
      }
    }
    if (current !== placeholder) setCurrent(placeholder);
  };

  return (
    <img
      src={current}
      alt={alt || ''}
      loading={loading}
      className={className}
      style={style}
      onError={handleError}
    />
  );
}
