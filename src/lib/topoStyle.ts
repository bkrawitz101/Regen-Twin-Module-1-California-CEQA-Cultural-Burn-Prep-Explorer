import maplibregl from 'maplibre-gl';
import mlcontour from 'maplibre-contour';
import type { BasemapTheme } from '../types';

export const TERRARIUM_DEM_URL =
  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

export const OPENFREEMAP_PLANET_URL = 'https://tiles.openfreemap.org/planet';

export const ESRI_SATELLITE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

let contourDemInstance: InstanceType<typeof mlcontour.DemSource> | null = null;
let contourProtocolRegistered = false;

export function ensureContourProtocol(): string {
  if (!contourDemInstance) {
    contourDemInstance = new mlcontour.DemSource({
      url: TERRARIUM_DEM_URL,
      encoding: 'terrarium',
      maxzoom: 15,
      minzoom: 6,
      worker: true,
      cacheSize: 120,
      timeoutMs: 10000,
    });
  }
  if (!contourProtocolRegistered) {
    contourDemInstance.setupMaplibre(maplibregl);
    contourProtocolRegistered = true;
  }

  return contourDemInstance.contourProtocolUrl({
    multiplier: 3.28084,
    overzoom: 1,
    thresholds: {
      8: [500, 2000],
      10: [200, 1000],
      11: [100, 500],
      13: [40, 200],
      15: [20, 100],
    },
    elevationKey: 'ele',
    levelKey: 'level',
    contourLayer: 'contours',
  });
}

export interface ThemePalette {
  bg: string;
  wood: string;
  grass: string;
  farmland: string;
  wetland: string;
  residential: string;
  water: string;
  waterway: string;
  contourMinor: string;
  contourMajor: string;
  contourLabel: string;
  roadMinor: string;
  roadMajor: string;
  roadHighway: string;
  boundaryLine: string;
  buildingFill: string;
  buildingOutline: string;
  buildingOpacity: number;
  labelColor: string;
  labelHalo: string;
  hillshadeExaggeration: number;
  hillshadeShadow: string;
  hillshadeHighlight: string;
  hillshadeAccent: string;
}

export function getThemePalette(theme: BasemapTheme): ThemePalette {
  const isDark = theme === 'dark';
  const isSat = theme === 'satellite';

  return {
    bg: isDark || isSat ? '#101112' : '#f7f6f2',
    wood: isDark ? '#1a231c' : '#e2ead9',
    grass: isDark ? '#191d18' : '#eeefe3',
    farmland: isDark ? '#201e17' : '#f0ebd9',
    wetland: isDark ? '#162121' : '#dce7e3',
    residential: isDark ? '#17181a' : '#eae8e1',
    water: isDark ? '#1a2a36' : '#c2d6e0',
    waterway: isSat ? '#60a5fa' : isDark ? '#3a5d75' : '#89aec2',
    contourMinor: isSat
      ? 'rgba(255,255,255,0.3)'
      : isDark
        ? 'rgba(212,212,216,0.22)'
        : 'rgba(92,74,56,0.22)',
    contourMajor: isSat
      ? 'rgba(255,255,255,0.68)'
      : isDark
        ? 'rgba(244,244,245,0.45)'
        : 'rgba(72,56,40,0.46)',
    contourLabel: isSat ? '#ffffff' : isDark ? '#d4d4d8' : '#4a3d31',
    roadMinor: isSat
      ? 'rgba(255,255,255,0.38)'
      : isDark
        ? '#2c2f34'
        : '#dedbd2',
    roadMajor: isSat
      ? 'rgba(255,255,255,0.65)'
      : isDark
        ? '#4a4e57'
        : '#b8b3a6',
    roadHighway: isSat
      ? 'rgba(250,204,21,0.88)'
      : isDark
        ? '#6c727f'
        : '#73706a',
    boundaryLine: isSat
      ? 'rgba(255,255,255,0.58)'
      : isDark
        ? 'rgba(255,255,255,0.28)'
        : 'rgba(0,0,0,0.32)',
    buildingFill: isSat ? '#e5e7eb' : isDark ? '#32343a' : '#eceae3',
    buildingOutline: isSat ? '#ffffff' : isDark ? '#52555e' : '#b8b4aa',
    buildingOpacity: isSat ? 0.55 : 0.92,
    labelColor: isDark || isSat ? '#f9fafb' : '#1f2937',
    labelHalo: isDark || isSat ? '#09090b' : '#f7f6f2',
    hillshadeExaggeration: isSat ? 0.18 : 0.35,
    hillshadeShadow: isDark || isSat ? '#000000' : '#3a3630',
    hillshadeHighlight: isDark || isSat ? '#4b5563' : '#ffffff',
    hillshadeAccent: isDark || isSat ? '#1f2937' : '#6b655c',
  };
}

export function buildTopographicStyle(
  theme: BasemapTheme,
  contourTileUrl: string
): maplibregl.StyleSpecification {
  const p = getThemePalette(theme);
  const isSat = theme === 'satellite';

  return {
    version: 8,
    name: 'Regen Twin Unified Topo & Satellite',
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      openmaptiles: {
        type: 'vector',
        url: OPENFREEMAP_PLANET_URL,
      },
      'terrain-dem': {
        type: 'raster-dem',
        tiles: [TERRARIUM_DEM_URL],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 15,
      },
      contours: {
        type: 'vector',
        tiles: [contourTileUrl],
        maxzoom: 16,
      },
      'satellite-imagery': {
        type: 'raster',
        tiles: [ESRI_SATELLITE_URL],
        tileSize: 256,
        maxzoom: 18,
        attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': p.bg },
      },
      {
        id: 'landcover-grass',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landcover',
        filter: ['==', ['get', 'class'], 'grass'],
        layout: { visibility: isSat ? 'none' : 'visible' },
        paint: { 'fill-color': p.grass, 'fill-opacity': 0.85 },
      },
      {
        id: 'landcover-wood',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landcover',
        filter: ['==', ['get', 'class'], 'wood'],
        layout: { visibility: isSat ? 'none' : 'visible' },
        paint: { 'fill-color': p.wood, 'fill-opacity': 0.85 },
      },
      {
        id: 'landuse-farmland',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landuse',
        filter: [
          'in',
          ['get', 'class'],
          ['literal', ['farmland', 'orchard', 'vineyard', 'meadow']],
        ],
        layout: { visibility: isSat ? 'none' : 'visible' },
        paint: { 'fill-color': p.farmland, 'fill-opacity': 0.75 },
      },
      {
        id: 'landcover-wetland',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landcover',
        filter: ['==', ['get', 'class'], 'wetland'],
        layout: { visibility: isSat ? 'none' : 'visible' },
        paint: { 'fill-color': p.wetland, 'fill-opacity': 0.85 },
      },
      {
        id: 'landuse-residential',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landuse',
        filter: ['==', ['get', 'class'], 'residential'],
        layout: { visibility: isSat ? 'none' : 'visible' },
        paint: { 'fill-color': p.residential, 'fill-opacity': 0.7 },
      },
      {
        id: 'water-fill',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'water',
        filter: ['!=', ['get', 'brunnel'], 'tunnel'],
        layout: { visibility: isSat ? 'none' : 'visible' },
        paint: { 'fill-color': p.water },
      },
      {
        id: 'satellite-raster',
        type: 'raster',
        source: 'satellite-imagery',
        layout: { visibility: isSat ? 'visible' : 'none' },
        paint: {
          'raster-opacity': 1,
          'raster-contrast': 0.04,
          'raster-saturation': -0.06,
        },
      },
      {
        id: 'terrain-hillshade',
        type: 'hillshade',
        source: 'terrain-dem',
        paint: {
          'hillshade-exaggeration': p.hillshadeExaggeration,
          'hillshade-shadow-color': p.hillshadeShadow,
          'hillshade-highlight-color': p.hillshadeHighlight,
          'hillshade-accent-color': p.hillshadeAccent,
        },
      },
      {
        id: 'waterway-river',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'waterway',
        filter: ['==', ['get', 'class'], 'river'],
        paint: {
          'line-color': p.waterway,
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.8, 14, 2.5],
          'line-opacity': isSat ? 0.65 : 1,
        },
      },
      {
        id: 'waterway-stream',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'waterway',
        filter: ['!=', ['get', 'class'], 'river'],
        minzoom: 10,
        paint: {
          'line-color': p.waterway,
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.6, 15, 1.4],
          'line-opacity': isSat ? 0.6 : 1,
        },
      },
      {
        id: 'contour-lines',
        type: 'line',
        source: 'contours',
        'source-layer': 'contours',
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'level'], 1],
            p.contourMajor,
            p.contourMinor,
          ],
          'line-width': ['case', ['==', ['get', 'level'], 1], 1.1, 0.55],
        },
      },
      {
        id: 'contour-labels',
        type: 'symbol',
        source: 'contours',
        'source-layer': 'contours',
        minzoom: 11,
        filter: ['==', ['get', 'level'], 1],
        layout: {
          'symbol-placement': 'line',
          'text-field': ['concat', ['get', 'ele'], ' ft'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 10,
          'text-max-angle': 25,
        },
        paint: {
          'text-color': p.contourLabel,
          'text-halo-color': p.labelHalo,
          'text-halo-width': 1.35,
        },
      },
      {
        id: 'boundary-admin',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'boundary',
        filter: ['<=', ['get', 'admin_level'], 6],
        paint: {
          'line-color': p.boundaryLine,
          'line-width': ['case', ['<=', ['get', 'admin_level'], 4], 1.4, 0.8],
          'line-dasharray': [4, 2],
        },
      },
      {
        id: 'road-minor',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 11,
        filter: [
          'in',
          ['get', 'class'],
          ['literal', ['minor', 'service', 'track', 'path']],
        ],
        paint: {
          'line-color': p.roadMinor,
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.6, 16, 2.2],
        },
      },
      {
        id: 'road-major',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: [
          'in',
          ['get', 'class'],
          ['literal', ['primary', 'secondary', 'tertiary']],
        ],
        paint: {
          'line-color': p.roadMajor,
          'line-width': ['interpolate', ['linear'], ['zoom'], 7, 0.6, 15, 3.2],
        },
      },
      {
        id: 'road-highway',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk']]],
        paint: {
          'line-color': p.roadHighway,
          'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.9, 14, 4],
        },
      },
      {
        id: 'building-footprint',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'building',
        minzoom: 12.5,
        paint: {
          'fill-color': p.buildingOutline,
          'fill-opacity': isSat ? 0.15 : 0.35,
        },
      },
      {
        id: 'building-3d',
        type: 'fill-extrusion',
        source: 'openmaptiles',
        'source-layer': 'building',
        minzoom: 13,
        filter: ['!', ['has', 'hide_3d']],
        paint: {
          'fill-extrusion-color': p.buildingFill,
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            13,
            0,
            13.4,
            ['coalesce', ['get', 'render_height'], 6],
          ],
          'fill-extrusion-base': [
            'interpolate',
            ['linear'],
            ['zoom'],
            13,
            0,
            13.4,
            ['coalesce', ['get', 'render_min_height'], 0],
          ],
          'fill-extrusion-opacity': p.buildingOpacity,
          'fill-extrusion-vertical-gradient': true,
        },
      },
      {
        id: 'mountain-peak-label',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'mountain_peak',
        minzoom: 10,
        layout: {
          'text-field': [
            'case',
            ['has', 'ele_ft'],
            ['concat', ['get', 'name'], '\n', ['get', 'ele_ft'], ' ft'],
            ['get', 'name'],
          ],
          'text-font': ['Noto Sans Italic'],
          'text-size': 10,
          'text-anchor': 'center',
        },
        paint: {
          'text-color': p.labelColor,
          'text-halo-color': p.labelHalo,
          'text-halo-width': 1.4,
        },
      },
      {
        id: 'road-label',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'transportation_name',
        minzoom: 12.5,
        layout: {
          'symbol-placement': 'line',
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 10,
        },
        paint: {
          'text-color': p.labelColor,
          'text-halo-color': p.labelHalo,
          'text-halo-width': 1.4,
        },
      },
      {
        id: 'place-label',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'place',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Bold'],
          'text-size': [
            'match',
            ['get', 'class'],
            'city',
            13,
            'town',
            11.5,
            10,
          ],
        },
        paint: {
          'text-color': p.labelColor,
          'text-halo-color': p.labelHalo,
          'text-halo-width': 1.6,
        },
      },
    ],
  };
}

export function applyBasemapThemeInPlace(
  map: maplibregl.Map,
  theme: BasemapTheme
) {
  const p = getThemePalette(theme);
  const isSat = theme === 'satellite';

  const setVis = (id: string, visible: boolean) => {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
    }
  };
  const setPaint = (id: string, prop: string, val: unknown) => {
    if (map.getLayer(id)) {
      try {
        map.setPaintProperty(id, prop, val);
      } catch {
        // ignore if layer paint property unavailable in fallback style
      }
    }
  };

  setVis('satellite-raster', isSat);
  for (const l of [
    'landcover-grass',
    'landcover-wood',
    'landuse-farmland',
    'landcover-wetland',
    'landuse-residential',
    'water-fill',
  ]) {
    setVis(l, !isSat);
  }

  setPaint('background', 'background-color', p.bg);
  setPaint('landcover-grass', 'fill-color', p.grass);
  setPaint('landcover-wood', 'fill-color', p.wood);
  setPaint('landuse-farmland', 'fill-color', p.farmland);
  setPaint('landcover-wetland', 'fill-color', p.wetland);
  setPaint('landuse-residential', 'fill-color', p.residential);
  setPaint('water-fill', 'fill-color', p.water);

  setPaint('terrain-hillshade', 'hillshade-exaggeration', p.hillshadeExaggeration);
  setPaint('terrain-hillshade', 'hillshade-shadow-color', p.hillshadeShadow);
  setPaint('terrain-hillshade', 'hillshade-highlight-color', p.hillshadeHighlight);
  setPaint('terrain-hillshade', 'hillshade-accent-color', p.hillshadeAccent);

  setPaint('waterway-river', 'line-color', p.waterway);
  setPaint('waterway-river', 'line-opacity', isSat ? 0.65 : 1);
  setPaint('waterway-stream', 'line-color', p.waterway);
  setPaint('waterway-stream', 'line-opacity', isSat ? 0.6 : 1);

  setPaint('contour-lines', 'line-color', [
    'case',
    ['==', ['get', 'level'], 1],
    p.contourMajor,
    p.contourMinor,
  ]);
  setPaint('contour-labels', 'text-color', p.contourLabel);
  setPaint('contour-labels', 'text-halo-color', p.labelHalo);

  setPaint('boundary-admin', 'line-color', p.boundaryLine);
  setPaint('road-minor', 'line-color', p.roadMinor);
  setPaint('road-major', 'line-color', p.roadMajor);
  setPaint('road-highway', 'line-color', p.roadHighway);

  setPaint('building-footprint', 'fill-color', p.buildingOutline);
  setPaint('building-footprint', 'fill-opacity', isSat ? 0.15 : 0.35);
  setPaint('building-3d', 'fill-extrusion-color', p.buildingFill);
  setPaint('building-3d', 'fill-extrusion-opacity', p.buildingOpacity);

  for (const lbl of ['mountain-peak-label', 'road-label', 'place-label']) {
    setPaint(lbl, 'text-color', p.labelColor);
    setPaint(lbl, 'text-halo-color', p.labelHalo);
  }
}

export function buildOfflineTopoFallbackStyle(
  theme: BasemapTheme
): maplibregl.StyleSpecification {
  return {
    version: 8,
    name: 'Offline Editorial Fallback',
    sources: {},
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color':
            theme === 'dark' || theme === 'satellite' ? '#101112' : '#f4f4f2',
        },
      },
    ],
  };
}
