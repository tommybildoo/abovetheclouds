import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

const MAP_STYLE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

function aircraftSvg(color, selected) {
  return `<svg width="${selected ? 36 : 28}" height="${selected ? 36 : 28}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="${selected ? 11 : 9}" fill="#020617" fill-opacity=".82" stroke="${color}" stroke-width="${selected ? 1.5 : .8}"/><path d="M12 2 L14.2 10 L21 13 L21 15 L14.2 13.6 L13 20 L16 21.5 L16 23 L12 22 L8 23 L8 21.5 L11 20 L9.8 13.6 L3 15 L3 13 L9.8 10 Z" fill="${color}" stroke="#020617" stroke-width=".55"/></svg>`;
}

export default function FlightMap({ flights = [], selectedIcao24, onSelect, argentinaMode }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const trailsRef = useRef({});
  const positionsRef = useRef({});

  useEffect(() => {
    const map = new maplibregl.Map({ container: containerRef.current, style: MAP_STYLE_URL, center: [0, 20], zoom: 1.6, attributionControl: true });
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    map.addControl(new maplibregl.FullscreenControl(), 'top-right');
    map.on('load', () => {
      map.addSource('flight-trails', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'flight-trails', type: 'line', source: 'flight-trails', paint: { 'line-color': '#38bdf8', 'line-width': 1.4, 'line-opacity': 0.48, 'line-blur': 0.25 } });
    });
    mapRef.current = map;
    return () => map.remove();
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.flyTo(argentinaMode ? { center: [-63.6, -38.4], zoom: 4, duration: 1200 } : { center: [0, 20], zoom: 1.6, duration: 1000 });
  }, [argentinaMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const ids = new Set(flights.map(f => f.icao24));
    for (const id of Object.keys(markersRef.current)) if (!ids.has(id)) { markersRef.current[id].remove(); delete markersRef.current[id]; delete positionsRef.current[id]; delete trailsRef.current[id]; }

    for (const f of flights) {
      if (f.latitude == null || f.longitude == null) continue;
      const selected = f.icao24 === selectedIcao24;
      const color = selected ? '#38bdf8' : f.category === 'MILITARY' ? '#fb7185' : f.category === 'CARGO' ? '#2dd4bf' : '#f8fafc';
      let marker = markersRef.current[f.icao24];
      if (!marker) {
        const el = document.createElement('div');
        el.style.cursor = 'pointer';
        el.style.width = '40px'; el.style.height = '40px';
        el.addEventListener('click', () => onSelect?.(f.icao24));
        marker = new maplibregl.Marker({ element: el, rotationAlignment: 'map' }).setLngLat([f.longitude, f.latitude]).addTo(map);
        markersRef.current[f.icao24] = marker;
      } else marker.setLngLat([f.longitude, f.latitude]);
      marker.getElement().innerHTML = aircraftSvg(color, selected);
      marker.setRotation(Number.isFinite(f.headingDeg) ? f.headingDeg : 0);
      const previous = positionsRef.current[f.icao24];
      if (!previous || Math.abs(previous[0] - f.longitude) > 0.001 || Math.abs(previous[1] - f.latitude) > 0.001) {
        const trail = trailsRef.current[f.icao24] || [];
        trail.push([f.longitude, f.latitude]);
        trailsRef.current[f.icao24] = trail.slice(-24);
        positionsRef.current[f.icao24] = [f.longitude, f.latitude];
      }
    }

    if (map.isStyleLoaded() && map.getSource('flight-trails')) {
      map.getSource('flight-trails').setData({ type: 'FeatureCollection', features: Object.entries(trailsRef.current).filter(([, p]) => p.length > 1).map(([id, p]) => ({ type: 'Feature', properties: { id }, geometry: { type: 'LineString', coordinates: p } })) });
    }
  }, [flights, selectedIcao24, onSelect]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} role="application" aria-label="AboveTheClouds live aircraft radar" />;
}
