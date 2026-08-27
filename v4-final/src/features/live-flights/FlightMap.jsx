import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

/**
 * V4 — performance rewrite.
 *
 * V3's FlightMap created one `maplibregl.Marker` (a real DOM element)
 * per aircraft and re-rendered its innerHTML on every poll tick. That
 * does not scale — hundreds of DOM nodes, hundreds of reflows, every
 * ~20s. This version instead keeps ALL aircraft in a single GeoJSON
 * source and renders them with MapLibre's native symbol/circle layers
 * (WebGL-rendered, not DOM), which is exactly what MapLibre is built
 * to do efficiently at any count. Updating positions is one
 * `source.setData(...)` call — MapLibre handles the diffing/redraw
 * internally instead of us tearing down and rebuilding hundreds of
 * elements.
 *
 * Clustering (built into MapLibre's GeoJSON source: `cluster: true`)
 * automatically groups nearby aircraft at low zoom and expands them as
 * the user zooms in — exactly the "cluster when zoom is low, show
 * individually on zoom" behavior requested.
 */
const MAP_STYLE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const SOURCE_ID = 'aircraft';
const CATEGORY_COLORS = {
  PASSENGER: '#f2f4f8',
  CARGO: '#4bd8c4',
  MILITARY: '#ff6b5e',
  GENERAL_AVIATION: '#ffb454',
  UNKNOWN: '#8a93a3',
};
const CATEGORIES = Object.keys(CATEGORY_COLORS);

/** Renders a clean aeronautical chevron (not an emoji) to a canvas ImageData, tinted per category, for map.addImage(). */
function makeAircraftIcon(color, selected) {
  const size = selected ? 48 : 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.translate(size / 2, size / 2);
  const s = size / 24;
  ctx.scale(s, s);
  ctx.translate(-12, -12);

  if (selected) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
  }

  const path = new Path2D('M12 2 L14.2 10 L21 13 L21 15 L14.2 13.6 L13 20 L16 21.5 L16 23 L12 22 L8 23 L8 21.5 L11 20 L9.8 13.6 L3 15 L3 13 L9.8 10 Z');
  ctx.fillStyle = color;
  ctx.strokeStyle = '#04050a';
  ctx.lineWidth = 0.8;
  ctx.fill(path);
  ctx.stroke(path);
  ctx.restore();
  return ctx.getImageData(0, 0, size, size);
}

function toGeoJSON(flights, selectedIcao24) {
  return {
    type: 'FeatureCollection',
    features: flights
      .filter((f) => f.latitude != null && f.longitude != null)
      .map((f) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [f.longitude, f.latitude] },
        properties: {
          icao24: f.icao24,
          category: CATEGORY_COLORS[f.category] ? f.category : 'UNKNOWN',
          heading: f.headingDeg || 0,
          selected: f.icao24 === selectedIcao24,
          iconId: `${CATEGORY_COLORS[f.category] ? f.category : 'UNKNOWN'}${f.icao24 === selectedIcao24 ? '-sel' : ''}`,
        },
      })),
  };
}

export default function FlightMap({ flights, selectedIcao24, onSelect, countryMode }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const readyRef = useRef(false);
  const latestFlights = useRef(flights);
  latestFlights.current = flights;

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

    map.on('load', () => {
      // Register one small canvas-rendered icon per category, plus a
      // larger glowing variant for the selected aircraft — loaded once,
      // reused for every feature via a data-driven icon-image expression.
      for (const cat of CATEGORIES) {
        map.addImage(cat, makeAircraftIcon(CATEGORY_COLORS[cat], false), { pixelRatio: 2 });
        map.addImage(`${cat}-sel`, makeAircraftIcon(CATEGORY_COLORS[cat], true), { pixelRatio: 2 });
      }

      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: toGeoJSON(latestFlights.current, selectedIcao24),
        cluster: true,
        clusterMaxZoom: 6,
        clusterRadius: 44,
      });

      // Clusters: a soft circle + count label. Only visible where MapLibre
      // has actually grouped points (low zoom / dense areas) — individual
      // aircraft render via the unclustered layer below once zoomed in.
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': 'rgba(255,180,84,0.18)',
          'circle-stroke-color': '#ffb454',
          'circle-stroke-width': 1,
          'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 50, 30],
        },
      });
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Open Sans Regular'],
          'text-size': 12,
        },
        paint: { 'text-color': '#ffb454' },
      });

      map.addLayer({
        id: 'aircraft-unclustered',
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': ['get', 'iconId'],
          'icon-size': 1,
          'icon-rotate': ['get', 'heading'],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
      });

      map.on('click', 'clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        const clusterId = features[0].properties.cluster_id;
        map.getSource(SOURCE_ID).getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return;
          map.easeTo({ center: features[0].geometry.coordinates, zoom });
        });
      });
      map.on('click', 'aircraft-unclustered', (e) => {
        const icao24 = e.features?.[0]?.properties?.icao24;
        if (icao24) onSelect(icao24);
      });
      map.on('mouseenter', 'aircraft-unclustered', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'aircraft-unclustered', () => { map.getCanvas().style.cursor = ''; });
      map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = ''; });

      readyRef.current = true;
    });

    return () => { readyRef.current = false; map.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // map is created once; data updates flow through setData below, not re-init

  // Fly to the selected country's region when "MY COUNTRY" mode is toggled.
  useEffect(() => {
    if (!mapRef.current || !countryMode?.bbox) return;
    const { minLat, maxLat, minLon, maxLon } = countryMode.bbox;
    mapRef.current.fitBounds([[minLon, minLat], [maxLon, maxLat]], { padding: 40, duration: 1000, maxZoom: 6 });
  }, [countryMode]);

  // Cheap update: replace the GeoJSON data in place. No DOM churn, no
  // per-marker teardown/rebuild — this is the fix for the "app grinds to
  // a halt with lots of aircraft" problem.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const source = map.getSource(SOURCE_ID);
    if (source) source.setData(toGeoJSON(flights, selectedIcao24));
  }, [flights, selectedIcao24]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} role="application" aria-label="Live aircraft map" />;
}
