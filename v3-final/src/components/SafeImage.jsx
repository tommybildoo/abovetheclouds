import React, { useEffect, useState } from 'react';

/**
 * SafeImage — renders local assets when available and automatically falls
 * back to a Wikimedia Commons thumbnail when a seeded image file has not
 * been added to public/images yet. This keeps the catalog usable without
 * requiring manual image uploads for every aircraft/airport.
 */
const PLACEHOLDERS = {
  aircraft: '/images/placeholders/aircraft-placeholder.svg',
  airport: '/images/placeholders/airport-placeholder.svg',
  photo: '/images/placeholders/photo-placeholder.svg',
};

const AIRCRAFT_NAMES = {
  '737': 'Boeing 737 aircraft',
  '747': 'Boeing 747 aircraft',
  '757': 'Boeing 757 aircraft',
  '767': 'Boeing 767 aircraft',
  '777': 'Boeing 777 aircraft',
  '787': 'Boeing 787 aircraft',
  'a220': 'Airbus A220 aircraft',
  'a320': 'Airbus A320 aircraft',
  'a330': 'Airbus A330 aircraft',
  'a340': 'Airbus A340 aircraft',
  'a350': 'Airbus A350 aircraft',
  'a380': 'Airbus A380 aircraft',
  'e170': 'Embraer E170 aircraft',
  'e175': 'Embraer E175 aircraft',
  'e190': 'Embraer E190 aircraft',
  'e195': 'Embraer E195 aircraft',
};

function normalizeSrc(src, fallback) {
  if (!src) return fallback;
  if (/^(https?:)?\\/\\//i.test(src) || src.startsWith('/')) return src;
  return `/${src}`;
}

function getWikimediaQuery(src, alt, kind) {
  if (kind === 'aircraft') {
    const key = String(src || '').split('/').pop()?.replace(/\\.[^.]+$/, '').toLowerCase();
    return AIRCRAFT_NAMES[key] || `${alt || key || 'aircraft'} aircraft`;
  }
  if (kind === 'airport') {
    const key = String(src || '').split('/').pop()?.replace(/\\.[^.]+$/, '').replace(/[-_]/g, ' ');
    return `${alt || key || 'airport'} airport`;
  }
  return alt || 'aviation';
}

async function findWikimediaImage(query) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: '6',
    gsrlimit: '5',
    prop: 'imageinfo',
    iiprop: 'url',
    iiurlwidth: '1400',
    format: 'json',
    origin: '*',
  });

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Wikimedia HTTP ${response.status}`);
  const data = await response.json();
  const pages = Object.values(data?.query?.pages || {});
  return pages.find((page) => page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url)?.imageinfo?.[0]?.thumburl
    || pages.find((page) => page?.imageinfo?.[0]?.url)?.imageinfo?.[0]?.url
    || null;
}

export default function SafeImage({ src, alt, kind = 'aircraft', className, style, loading = 'lazy' }) {
  const fallback = PLACEHOLDERS[kind] || PLACEHOLDERS.aircraft;
  const localSrc = normalizeSrc(src, fallback);
  const [current, setCurrent] = useState(localSrc);
  const [triedRemote, setTriedRemote] = useState(false);

  useEffect(() => {
    setCurrent(localSrc);
    setTriedRemote(false);
  }, [localSrc]);

  const handleError = async () => {
    if (current !== localSrc) {
      if (current !== fallback) setCurrent(fallback);
      return;
    }

    if (triedRemote) {
      setCurrent(fallback);
      return;
    }

    setTriedRemote(true);
    try {
      const query = getWikimediaQuery(src, alt, kind);
      const remote = await findWikimediaImage(query);
      setCurrent(remote || fallback);
    } catch {
      setCurrent(fallback);
    }
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
