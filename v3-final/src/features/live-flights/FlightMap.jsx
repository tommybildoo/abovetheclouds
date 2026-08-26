import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

/**
 * Dark cinematic MapLibre map with custom AboveTheClouds aircraft
 * markers (an SVG chevron, not an emoji), rotated by heading, that
 * pulse when selected. Uses a free dark vector basemap style — swap
 * `MAP_STYLE_URL` for your own MapTiler/Stadia key for production.
 */
const MAP_STYLE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

function aircraftSvg(color, selected) {
  return `
    <svg width="${selected ? 34 : 26}" height="${selected ? 34 : 26}" viewBox="0 0 24 24" style="filter:drop-shadow(0 0 ${selected ? 10 : 4}px ${color})">
      <path d="M12 2 L14.2 10 L21 13 L21 15 L14.2 13.6 L13 20 L16 21.5 L16 23 L12 22 L8 23 L8 21.5 L11 20 L9.8 13.6 L3 15 L3 13 L9.8 10 Z" fill="${color}" stroke="#04050a" stroke-width="0.6"/>
    </svg>`;
}

export default function FlightMap({ flights, selectedIcao24, onSelect, argentinaMode }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: [0, 20],
      zoom: 1.6,
      attributionControl: true,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.FullscreenControl(), 'top-right');
    mapRef.current = map;
    return () => map.remove();
  }, []);

  // Fly to Argentina when that filter is toggled
  useEffect(() => {
    if (!mapRef.current) return;
    if (argentinaMode) {
      mapRef.current.flyTo({ center: [-63.6, -38.4], zoom: 4, duration: 1200 });
    }
  }, [argentinaMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(flights.map((f) => f.icao24));

    // Remove stale markers
    for (const id of Object.keys(markersRef.current)) {
      if (!currentIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    }

    for (const f of flights) {
      if (f.latitude == null || f.longitude == null) continue;
      const selected = f.icao24 === selectedIcao24;
      const color = selected ? '#ffb454' : f.category === 'MILITARY' ? '#ff6b5e' : f.category === 'CARGO' ? '#4bd8c4' : '#f2f4f8';

      let marker = markersRef.current[f.icao24];
      if (!marker) {
        const el = document.createElement('div');
        el.style.cursor = 'pointer';
        el.style.transformOrigin = 'center';
        el.addEventListener('click', () => onSelect(f.icao24));
        marker = new maplibregl.Marker({ element: el, rotationAlignment: 'map' })
          .setLngLat([f.longitude, f.latitude])
          .addTo(map);
        markersRef.current[f.icao24] = marker;
      } else {
        marker.setLngLat([f.longitude, f.latitude]);
      }
      marker.getElement().innerHTML = aircraftSvg(color, selected);
      marker.setRotation(f.headingDeg || 0);
    }
  }, [flights, selectedIcao24, onSelect]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} role="application" aria-label="Live aircraft map" />;
}
