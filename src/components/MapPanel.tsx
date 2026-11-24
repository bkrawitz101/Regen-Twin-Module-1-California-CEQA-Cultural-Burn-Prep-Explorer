import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';
import {
  Axis3d,
  Box,
  Compass,
  Expand,
  Layers,
  Maximize2,
  Minimize2,
  Moon,
  Mountain,
  Move3d,
  Play,
  Radar,
  RotateCcw,
  RotateCw,
  Satellite,
  Square,
  Sun,
} from 'lucide-react';
import type { FeatureCollection, Geometry } from 'geojson';
import { THREE_SUNS_COORDS } from '../data/caCounties';
import { createRadiusCircle } from '../lib/spatial';
import {
  applyBasemapThemeInPlace,
  buildOfflineTopoFallbackStyle,
  buildTopographicStyle,
  ensureContourProtocol,
} from '../lib/topoStyle';
import type {
  BasemapTheme,
  CrmRecord,
  OriginPoint,
  SearchMode,
  SpatialProject,
} from '../types';

interface MapPanelProps {
  projects: SpatialProject[];
  crmRecords: Record<string, CrmRecord>;
  selectedProjectId: string | null;
  onSelectProject: (project: SpatialProject) => void;
  onProbeLocation: (lng: number, lat: number) => void;
  onScanAreaPrivateSites: (bbox: [number, number, number, number]) => void;
  isScanningPrivate: boolean;
  origin: OriginPoint;
  searchMode: SearchMode;
  radiusMiles: number;
  focusTrigger: number;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function MapPanel({
  projects,
  crmRecords,
  selectedProjectId,
  onSelectProject,
  onProbeLocation,
  onScanAreaPrivateSites,
  isScanningPrivate,
  origin,
  searchMode,
  radiusMiles,
  focusTrigger,
  isFullscreen = false,
  onToggleFullscreen,
}: MapPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const contourUrlRef = useRef<string | null>(null);

  const [basemap, setBasemap] = useState<BasemapTheme>('light');
  const [styleReady, setStyleReady] = useState(false);

  // Interactive 3D & Topo Layer Toggles
  const [is3dTilt, setIs3dTilt] = useState(true);
  const [bearingDeg, setBearingDeg] = useState(348);
  const [pitchDeg, setPitchDeg] = useState(45);
  const [rollDeg, setRollDeg] = useState(0);
  const [orbitDragMode, setOrbitDragMode] = useState(false);
  const [autoOrbit, setAutoOrbit] = useState(false);
  const [gimbalOpen, setGimbalOpen] = useState(false);
  const [showContours, setShowContours] = useState(true);
  const [showTerrain, setShowTerrain] = useState(true);
  const [showBuildings, setShowBuildings] = useState(true);
  const [showIndicators, setShowIndicators] = useState(true);
  const [layersMenuOpen, setLayersMenuOpen] = useState(false);
  const orbitPadDraggingRef = useRef(false);

  const projectsById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  const polygonFc = useMemo<FeatureCollection<Geometry>>(
    () => ({
      type: 'FeatureCollection',
      features: projects
        .filter(
          (p) =>
            p.geometry.type === 'Polygon' || p.geometry.type === 'MultiPolygon'
        )
        .map((p) => ({
          type: 'Feature',
          geometry: p.geometry,
          properties: {
            id: p.id,
            schNumber: p.schNumber,
            title: p.title,
            county: p.county,
            privacyScope: p.privacyScope,
            totalAcres: p.totalAcres,
            distanceFromOriginMiles: p.distanceFromOriginMiles,
            outreachStatus:
              crmRecords[p.id]?.outreachStatus ?? 'Not Contacted',
            isSelected: p.id === selectedProjectId ? 1 : 0,
          },
        })),
    }),
    [projects, crmRecords, selectedProjectId]
  );

  const pointFc = useMemo<FeatureCollection<Geometry>>(
    () => ({
      type: 'FeatureCollection',
      features: projects.map((p) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: p.centroid,
        },
        properties: {
          id: p.id,
          schNumber: p.schNumber,
          title: p.title,
          county: p.county,
          source: p.source,
          privacyScope: p.privacyScope,
          totalAcres: p.totalAcres,
          distanceFromOriginMiles: p.distanceFromOriginMiles,
          outreachStatus: crmRecords[p.id]?.outreachStatus ?? 'Not Contacted',
          isPolygon:
            p.geometry.type === 'Polygon' || p.geometry.type === 'MultiPolygon'
              ? 1
              : 0,
          isSelected: p.id === selectedProjectId ? 1 : 0,
        },
      })),
    }),
    [projects, crmRecords, selectedProjectId]
  );

  const originFc = useMemo<FeatureCollection<Geometry>>(
    () => ({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: origin.coords },
          properties: { address: origin.address },
        },
      ],
    }),
    [origin]
  );

  const radiusFc = useMemo<FeatureCollection<Geometry>>(() => {
    if (searchMode !== 'radius') {
      return { type: 'FeatureCollection', features: [] };
    }
    return {
      type: 'FeatureCollection',
      features: [createRadiusCircle(origin.coords, radiusMiles)],
    };
  }, [searchMode, origin.coords, radiusMiles]);

  const selectRef = useRef(onSelectProject);
  selectRef.current = onSelectProject;
  const probeRef = useRef(onProbeLocation);
  probeRef.current = onProbeLocation;
  const projectsByIdRef = useRef(projectsById);
  projectsByIdRef.current = projectsById;

  const ensureOverlayLayers = (map: maplibregl.Map, theme: BasemapTheme) => {
    const isDarkOrSat = theme === 'dark' || theme === 'satellite';
    const stroke = isDarkOrSat ? '#ffffff' : '#000000';
    const fill = isDarkOrSat ? '#ffffff' : '#111111';
    const pointFill = isDarkOrSat ? '#ffffff' : '#000000';
    const pointStroke = isDarkOrSat ? '#000000' : '#ffffff';

    if (!map.getSource('projects-poly')) {
      map.addSource('projects-poly', { type: 'geojson', data: polygonFc });
    }
    if (!map.getSource('projects-pt')) {
      map.addSource('projects-pt', { type: 'geojson', data: pointFc });
    }
    if (!map.getSource('origin-radius')) {
      map.addSource('origin-radius', { type: 'geojson', data: radiusFc });
    }
    if (!map.getSource('origin-pt')) {
      map.addSource('origin-pt', { type: 'geojson', data: originFc });
    }

    // Insert polygon/parcel overlays BELOW 3D buildings & labels so parcels drape cleanly over terrain without burying buildings
    const beforeId = map.getLayer('building-3d')
      ? 'building-3d'
      : undefined;

    if (!map.getLayer('radius-fill')) {
      map.addLayer(
        {
          id: 'radius-fill',
          type: 'fill',
          source: 'origin-radius',
          paint: { 'fill-color': fill, 'fill-opacity': 0.04 },
        },
        beforeId
      );
    }
    if (!map.getLayer('radius-line')) {
      map.addLayer(
        {
          id: 'radius-line',
          type: 'line',
          source: 'origin-radius',
          paint: {
            'line-color': stroke,
            'line-width': 1.5,
            'line-dasharray': [4, 3],
          },
        },
        beforeId
      );
    }

    if (!map.getLayer('projects-poly-fill')) {
      map.addLayer(
        {
          id: 'projects-poly-fill',
          type: 'fill',
          source: 'projects-poly',
          paint: {
            'fill-color': [
              'case',
              ['==', ['get', 'isSelected'], 1],
              theme === 'dark' ? '#ffffff' : '#000000',
              [
                '==',
                ['get', 'outreachStatus'],
                'Committed for Jan CCC App',
              ],
              '#10b981',
              ['==', ['get', 'privacyScope'], 'private_recorded'],
              '#d97706',
              ['==', ['get', 'privacyScope'], 'completely_private'],
              '#dc2626',
              fill,
            ],
            'fill-opacity': [
              'case',
              ['==', ['get', 'isSelected'], 1],
              0.42,
              [
                '==',
                ['get', 'outreachStatus'],
                'Committed for Jan CCC App',
              ],
              0.32,
              0.18,
            ],
          },
        },
        beforeId
      );
    }

    if (!map.getLayer('projects-poly-outline')) {
      map.addLayer(
        {
          id: 'projects-poly-outline',
          type: 'line',
          source: 'projects-poly',
          paint: {
            'line-color': [
              'case',
              ['==', ['get', 'isSelected'], 1],
              theme === 'dark' ? '#facc15' : '#000000',
              ['==', ['get', 'privacyScope'], 'private_recorded'],
              '#b45309',
              ['==', ['get', 'privacyScope'], 'completely_private'],
              '#b91c1c',
              stroke,
            ],
            'line-width': ['case', ['==', ['get', 'isSelected'], 1], 2.5, 1.1],
          },
        },
        beforeId
      );
    }

    if (!map.getLayer('projects-pt-circle')) {
      map.addLayer({
        id: 'projects-pt-circle',
        type: 'circle',
        source: 'projects-pt',
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'isSelected'], 1],
            8,
            ['==', ['get', 'isPolygon'], 1],
            3.5,
            5.5,
          ],
          'circle-color': [
            'case',
            [
              '==',
              ['get', 'outreachStatus'],
              'Committed for Jan CCC App',
            ],
            '#10b981',
            ['==', ['get', 'privacyScope'], 'private_recorded'],
            '#d97706',
            ['==', ['get', 'privacyScope'], 'completely_private'],
            '#dc2626',
            pointFill,
          ],
          'circle-stroke-color': pointStroke,
          'circle-stroke-width': 1.25,
          'circle-opacity': [
            'case',
            ['==', ['get', 'isPolygon'], 1],
            0.75,
            0.95,
          ],
        },
      });
    }

    if (!map.getLayer('origin-pt-marker')) {
      map.addLayer({
        id: 'origin-pt-marker',
        type: 'circle',
        source: 'origin-pt',
        paint: {
          'circle-radius': 7,
          'circle-color': theme === 'dark' ? '#ffffff' : '#000000',
          'circle-stroke-color': theme === 'dark' ? '#000000' : '#ffffff',
          'circle-stroke-width': 2.5,
        },
      });
    }
  };

  const applyLayerToggles = (map: maplibregl.Map) => {
    if (map.getSource('terrain-dem')) {
      map.setTerrain(
        showTerrain
          ? { source: 'terrain-dem', exaggeration: 1.25 }
          : null
      );
    }

    const setVis = (layerId: string, visible: boolean) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(
          layerId,
          'visibility',
          visible ? 'visible' : 'none'
        );
      }
    };

    setVis('terrain-hillshade', showTerrain);
    setVis('contour-lines', showContours);
    setVis('contour-labels', showContours);
    setVis('building-3d', showBuildings);
    setVis('building-footprint', showBuildings);
    setVis('projects-poly-fill', showIndicators);
    setVis('projects-poly-outline', showIndicators);
    setVis('projects-pt-circle', showIndicators);
  };

  // Initialize MapLibre 3D Topographic Map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const contourUrl = ensureContourProtocol();
    contourUrlRef.current = contourUrl;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildTopographicStyle('light', contourUrl),
      center: THREE_SUNS_COORDS,
      zoom: 9.2,
      pitch: 45,
      bearing: -12,
      maxPitch: 85,
      dragRotate: true,
      pitchWithRotate: true,
      touchPitch: true,
      attributionControl: { compact: true },
    });

    map.addControl(
      new maplibregl.NavigationControl({
        showCompass: true,
        visualizePitch: true,
      }),
      'top-right'
    );

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 10,
    });
    popupRef.current = popup;

    map.on('error', (ev) => {
      // Only fall back to blank editorial style if the vector planet style itself fails to load
      if (
        !map.isStyleLoaded() &&
        ev?.error?.message?.toLowerCase().includes('style')
      ) {
        map.setStyle(buildOfflineTopoFallbackStyle(basemap));
      }
    });

    map.on('style.load', () => {
      ensureOverlayLayers(map, basemap);
      applyLayerToggles(map);
      setStyleReady(true);
    });

    map.on('pitch', () => {
      const p = Math.round(map.getPitch());
      setPitchDeg(p);
      setIs3dTilt(p > 8);
    });

    map.on('rotate', () => {
      setBearingDeg(Math.round(((map.getBearing() % 360) + 360) % 360));
    });

    map.on('roll', () => {
      setRollDeg(Math.round(map.getRoll()));
    });

    const handleEnter = (e: maplibregl.MapLayerMouseEvent) => {
      map.getCanvas().style.cursor = 'pointer';
      const feat = e.features?.[0];
      if (!feat) return;
      const props = feat.properties ?? {};
      const acres = Number(props.totalAcres || 0).toLocaleString();
      const dist = Number(props.distanceFromOriginMiles || 0).toFixed(1);
      popup
        .setLngLat(e.lngLat)
        .setHTML(
          `<div style="font-size:11px;line-height:1.35;color:#000;max-width:250px;">
            <div style="font-family:monospace;font-size:10px;color:#555;">${props.schNumber ?? ''} · ${props.county ?? ''}</div>
            <div style="font-weight:700;margin:2px 0;">${props.title ?? ''}</div>
            <div style="font-family:monospace;font-size:10px;">${acres} ac · ${dist} mi · ${props.outreachStatus ?? ''}</div>
          </div>`
        )
        .addTo(map);
    };

    const handleLeave = () => {
      map.getCanvas().style.cursor = '';
      popup.remove();
    };

    const handleClick = (e: maplibregl.MapLayerMouseEvent) => {
      const id = e.features?.[0]?.properties?.id as string | undefined;
      if (!id) return;
      const proj = projectsByIdRef.current.get(id);
      if (proj) selectRef.current(proj);
    };

    for (const layerId of ['projects-poly-fill', 'projects-pt-circle']) {
      map.on('mouseenter', layerId, handleEnter);
      map.on('mouseleave', layerId, handleLeave);
      map.on('click', layerId, handleClick);
    }

    map.on('click', (e) => {
      const activeLayers = ['projects-poly-fill', 'projects-pt-circle'].filter(
        (id) =>
          Boolean(map.getLayer(id)) &&
          map.getLayoutProperty(id, 'visibility') !== 'none'
      );
      const hits =
        activeLayers.length > 0
          ? map.queryRenderedFeatures(e.point, { layers: activeLayers })
          : [];
      if (hits.length === 0) {
        probeRef.current(e.lngLat.lng, e.lngLat.lat);
      }
    });

    mapRef.current = map;

    const ro = new ResizeObserver(() => {
      map.resize();
    });
    if (containerRef.current) {
      ro.observe(containerRef.current);
    }

    return () => {
      ro.disconnect();
      popup.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Switch between light / dark / satellite in place without tearing down terrain or layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) return;
    applyBasemapThemeInPlace(map, basemap);

    const isDarkOrSat = basemap === 'dark' || basemap === 'satellite';
    const stroke = isDarkOrSat ? '#ffffff' : '#000000';
    const fill = isDarkOrSat ? '#ffffff' : '#111111';
    if (map.getLayer('radius-line')) {
      map.setPaintProperty('radius-line', 'line-color', stroke);
    }
    if (map.getLayer('radius-fill')) {
      map.setPaintProperty('radius-fill', 'fill-color', fill);
    }
    if (map.getLayer('projects-poly-outline')) {
      map.setPaintProperty('projects-poly-outline', 'line-color', [
        'case',
        ['==', ['get', 'isSelected'], 1],
        isDarkOrSat ? '#facc15' : '#000000',
        ['==', ['get', 'privacyScope'], 'private_recorded'],
        '#f59e0b',
        ['==', ['get', 'privacyScope'], 'completely_private'],
        '#ef4444',
        stroke,
      ]);
    }
  }, [basemap, styleReady]);

  // Sync GeoJSON sources & visibility toggles
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) return;
    ensureOverlayLayers(map, basemap);
    applyLayerToggles(map);

    (map.getSource('projects-poly') as maplibregl.GeoJSONSource | undefined)?.setData(
      polygonFc
    );
    (map.getSource('projects-pt') as maplibregl.GeoJSONSource | undefined)?.setData(
      pointFc
    );
    (map.getSource('origin-radius') as maplibregl.GeoJSONSource | undefined)?.setData(
      radiusFc
    );
    (map.getSource('origin-pt') as maplibregl.GeoJSONSource | undefined)?.setData(
      originFc
    );
  }, [
    styleReady,
    basemap,
    polygonFc,
    pointFc,
    radiusFc,
    originFc,
    showContours,
    showTerrain,
    showBuildings,
    showIndicators,
  ]);

  // Fly to selected site when explicitly triggered
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedProjectId || focusTrigger === 0) return;
    const proj = projectsById.get(selectedProjectId);
    if (!proj) return;
    try {
      if (proj.geometry.type === 'Point') {
        map.flyTo({
          center: proj.centroid,
          zoom: 14.2,
          pitch: is3dTilt ? 55 : 0,
          duration: 900,
        });
      } else {
        const bbox = turf.bbox(turf.feature(proj.geometry)) as [
          number,
          number,
          number,
          number,
        ];
        map.fitBounds(bbox, {
          padding: 60,
          maxZoom: 14.5,
          pitch: is3dTilt ? 50 : 0,
          duration: 900,
        });
      }
    } catch {
      map.flyTo({ center: proj.centroid, zoom: 13.5, duration: 800 });
    }
  }, [focusTrigger]);

  const handleToggle3dTilt = () => {
    const map = mapRef.current;
    if (!map) return;
    const next = !is3dTilt;
    setIs3dTilt(next);
    map.easeTo({
      pitch: next ? 55 : 0,
      bearing: next ? map.getBearing() || -18 : 0,
      duration: 650,
    });
  };

  const handleRotateBy = (deltaDeg: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({
      bearing: map.getBearing() + deltaDeg,
      duration: 420,
    });
  };

  const handleResetNorth = () => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({
      bearing: 0,
      duration: 450,
    });
  };

  const handleResetAllAxes = () => {
    const map = mapRef.current;
    if (!map) return;
    setAutoOrbit(false);
    map.easeTo({
      bearing: 0,
      pitch: 0,
      roll: 0,
      duration: 500,
    });
  };

  // Left-click / touch free multi-axis orbit drag when Orbit Drag mode is active
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const canvas = map.getCanvas();

    if (orbitDragMode) {
      map.dragPan.disable();
      canvas.style.cursor = 'grab';
    } else {
      map.dragPan.enable();
      canvas.style.cursor = '';
      return;
    }

    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.style.cursor = 'grabbing';
    };

    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      const nextBearing = map.getBearing() - dx * 0.45;
      const nextPitch = Math.max(0, Math.min(85, map.getPitch() - dy * 0.35));
      map.jumpTo({
        bearing: nextBearing,
        pitch: nextPitch,
      });
    };

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      canvas.style.cursor = 'grab';
    };

    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    return () => {
      map.dragPan.enable();
      canvas.style.cursor = '';
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [orbitDragMode, styleReady]);

  // Continuous 360° smooth orbit loop
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !autoOrbit) return;
    let rafId = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;
      map.setBearing(map.getBearing() + dt * 14);
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [autoOrbit]);

  const handleFlyBenchmark3Suns = () => {
    const map = mapRef.current;
    if (!map) return;
    setIs3dTilt(true);
    setShowTerrain(true);
    setShowContours(true);
    setShowBuildings(true);
    map.flyTo({
      center: THREE_SUNS_COORDS,
      zoom: 14.8,
      pitch: 55,
      bearing: -24,
      duration: 1200,
    });
  };

  const handleFitFiltered = () => {
    const map = mapRef.current;
    if (!map || projects.length === 0) return;
    try {
      const fc: FeatureCollection = {
        type: 'FeatureCollection',
        features: projects.map((p) => turf.point(p.centroid)),
      };
      const bbox = turf.bbox(fc) as [number, number, number, number];
      map.fitBounds(bbox, { padding: 48, maxZoom: 11.5, duration: 700 });
    } catch {
      // ignore
    }
  };

  return (
    <div
      className={`relative h-full w-full bg-neutral-100 ${
        isFullscreen ? '' : 'border-b lg:border-b-0 border-black'
      }`}
    >
      <div ref={containerRef} className="h-full w-full" />

      {/* Top-left Floating Topo & 3D Control Bar */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5 max-w-[calc(100%-56px)]">
        <button
          type="button"
          onClick={handleToggle3dTilt}
          className={`inline-flex items-center gap-1 border border-black px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider cursor-pointer transition-colors ${
            is3dTilt
              ? 'bg-black text-white hover:bg-neutral-800'
              : 'bg-white text-black hover:bg-neutral-100'
          }`}
          title="Toggle between 2D Top-Down and 3D Topo Tilt (55°)"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>{is3dTilt ? '3D Topo 55°' : '2D Top-Down'}</span>
        </button>

        <button
          type="button"
          onClick={handleFlyBenchmark3Suns}
          className="inline-flex items-center gap-1 border border-black bg-white text-black px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
          title="Fly 3D camera to 3 Suns Farm benchmark parcel (Nevada City, CA)"
        >
          <Mountain className="w-3.5 h-3.5" />
          <span>3 Suns 3D</span>
        </button>

        {/* 3-Way Basemap Switcher: Light Topo | Dark Topo | Satellite */}
        <div className="inline-flex border border-black bg-white divide-x divide-black">
          <button
            type="button"
            onClick={() => setBasemap('light')}
            className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider cursor-pointer ${
              basemap === 'light'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
            title="Light Topographic Map"
          >
            <Sun className="w-3 h-3" />
            <span className="hidden sm:inline">Light</span>
          </button>
          <button
            type="button"
            onClick={() => setBasemap('dark')}
            className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider cursor-pointer ${
              basemap === 'dark'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
            title="Dark Topographic Map"
          >
            <Moon className="w-3 h-3" />
            <span className="hidden sm:inline">Dark</span>
          </button>
          <button
            type="button"
            onClick={() => setBasemap('satellite')}
            className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider cursor-pointer ${
              basemap === 'satellite'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
            title="3D Satellite Hybrid (Esri World Imagery + Contours)"
          >
            <Satellite className="w-3 h-3" />
            <span>Satellite</span>
          </button>
        </div>

        {/* Multi-Axis Orbit Drag & 3-Axis Gimbal Controls */}
        <button
          type="button"
          onClick={() => setOrbitDragMode((v) => !v)}
          className={`inline-flex items-center gap-1 border border-black px-2 py-1 text-[11px] font-semibold uppercase tracking-wider cursor-pointer ${
            orbitDragMode
              ? 'bg-black text-white'
              : 'bg-white text-black hover:bg-neutral-100'
          }`}
          title="Toggle Left-Drag Multi-Axis Orbit (drag left/right = Yaw, up/down = Pitch)"
        >
          <Move3d className="w-3.5 h-3.5" />
          <span>{orbitDragMode ? 'Orbit Drag: ON' : 'Orbit Drag'}</span>
        </button>

        <div className="relative inline-flex border border-black bg-white divide-x divide-black">
          <button
            type="button"
            onClick={() => handleRotateBy(-45)}
            className="px-1.5 py-1 hover:bg-neutral-100 cursor-pointer"
            title="Rotate Yaw -45°"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setGimbalOpen((v) => !v)}
            className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono-tabular font-semibold cursor-pointer ${
              gimbalOpen ? 'bg-black text-white' : 'hover:bg-neutral-100'
            }`}
            title="Open Full Multi-Axis 3D Gimbal (Yaw, Pitch, Roll)"
          >
            <Axis3d className="w-3.5 h-3.5" />
            <span>
              Y{bearingDeg}° P{pitchDeg}° R{rollDeg}°
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleRotateBy(45)}
            className="px-1.5 py-1 hover:bg-neutral-100 cursor-pointer"
            title="Rotate Yaw +45°"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {gimbalOpen && (
            <div className="absolute left-0 top-full mt-1 w-64 border border-black bg-white p-3 space-y-2.5 text-[11px] z-40">
              <div className="flex items-center justify-between border-b border-black pb-1.5">
                <span className="font-semibold uppercase tracking-wider text-[10px]">
                  Multi-Axis 3D Gimbal
                </span>
                <button
                  type="button"
                  onClick={handleResetAllAxes}
                  className="text-[10px] uppercase tracking-wider underline cursor-pointer"
                >
                  Reset 0/0/0
                </button>
              </div>

              {/* 2D Interactive Gimbal Trackpad (Yaw + Pitch) */}
              <div>
                <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
                  2D Orbit Pad (Drag X=Yaw, Y=Pitch)
                </div>
                <div
                  onPointerDown={(e) => {
                    orbitPadDraggingRef.current = true;
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    if (!orbitPadDraggingRef.current || !mapRef.current) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const nx = Math.max(
                      0,
                      Math.min(1, (e.clientX - rect.left) / rect.width)
                    );
                    const ny = Math.max(
                      0,
                      Math.min(1, (e.clientY - rect.top) / rect.height)
                    );
                    const targetBearing = (nx - 0.5) * 360;
                    const targetPitch = (1 - ny) * 85;
                    mapRef.current.jumpTo({
                      bearing: targetBearing,
                      pitch: targetPitch,
                    });
                  }}
                  onPointerUp={() => {
                    orbitPadDraggingRef.current = false;
                  }}
                  className="relative h-24 w-full border border-black bg-neutral-50 cursor-crosshair select-none touch-none"
                >
                  <div className="absolute inset-y-0 left-1/2 w-px bg-neutral-300" />
                  <div className="absolute inset-x-0 top-1/2 h-px bg-neutral-300" />
                  <div
                    className="absolute w-3 h-3 bg-black border border-white -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{
                      left: `${((((bearingDeg > 180 ? bearingDeg - 360 : bearingDeg) / 360) + 0.5) * 100)}%`,
                      top: `${(1 - pitchDeg / 85) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Yaw Slider */}
              <div className="space-y-0.5">
                <div className="flex justify-between font-mono-tabular text-[10px]">
                  <span className="uppercase font-semibold">Yaw (Bearing)</span>
                  <span>{bearingDeg}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={bearingDeg}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    mapRef.current?.jumpTo({ bearing: v });
                  }}
                  className="w-full accent-black cursor-pointer"
                />
              </div>

              {/* Pitch Slider */}
              <div className="space-y-0.5">
                <div className="flex justify-between font-mono-tabular text-[10px]">
                  <span className="uppercase font-semibold">Pitch (Tilt)</span>
                  <span>{pitchDeg}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={85}
                  value={pitchDeg}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    mapRef.current?.jumpTo({ pitch: v });
                  }}
                  className="w-full accent-black cursor-pointer"
                />
              </div>

              {/* Roll Slider */}
              <div className="space-y-0.5">
                <div className="flex justify-between font-mono-tabular text-[10px]">
                  <span className="uppercase font-semibold">Roll (Bank)</span>
                  <span>{rollDeg}°</span>
                </div>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  value={rollDeg}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    mapRef.current?.jumpTo({ roll: v });
                  }}
                  className="w-full accent-black cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setAutoOrbit((v) => !v)}
                  className={`flex-1 inline-flex items-center justify-center gap-1 border border-black px-2 py-1 text-[10px] font-semibold uppercase tracking-wider cursor-pointer ${
                    autoOrbit ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
                  }`}
                >
                  {autoOrbit ? (
                    <>
                      <Square className="w-3 h-3" />
                      <span>Stop Orbit</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3" />
                      <span>Auto-Orbit 360°</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleResetNorth}
                  className="border border-black bg-white hover:bg-neutral-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider cursor-pointer"
                >
                  North
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleFitFiltered}
          className="inline-flex items-center gap-1 border border-black bg-white text-black px-2 py-1 text-[11px] font-semibold uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
          title="Zoom map to fit all filtered sites"
        >
          <Maximize2 className="w-3 h-3" />
          <span>Fit ({projects.length})</span>
        </button>

        <button
          type="button"
          disabled={isScanningPrivate}
          onClick={() => {
            const map = mapRef.current;
            if (!map) return;
            const b = map.getBounds();
            onScanAreaPrivateSites([
              b.getWest(),
              b.getSouth(),
              b.getEast(),
              b.getNorth(),
            ]);
          }}
          className="inline-flex items-center gap-1 border border-black bg-black text-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider cursor-pointer hover:bg-neutral-800 disabled:opacity-50"
          title="Load live CCED Easements & CalTREES Timber Plans inside current map view"
        >
          <Radar
            className={`w-3 h-3 ${isScanningPrivate ? 'animate-spin' : ''}`}
          />
          <span>{isScanningPrivate ? 'Scanning...' : 'Scan Area'}</span>
        </button>

        {/* Layer Toggles Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setLayersMenuOpen((v) => !v)}
            className={`inline-flex items-center gap-1 border border-black px-2 py-1 text-[11px] font-semibold uppercase tracking-wider cursor-pointer ${
              layersMenuOpen
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Layers</span>
          </button>

          {layersMenuOpen && (
            <div className="absolute left-0 top-full mt-1 w-48 border border-black bg-white p-2 space-y-1.5 text-[11px] z-30">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-medium">Contours (ft)</span>
                <input
                  type="checkbox"
                  checked={showContours}
                  onChange={(e) => setShowContours(e.target.checked)}
                  className="accent-black"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-medium">3D Terrain + Relief</span>
                <input
                  type="checkbox"
                  checked={showTerrain}
                  onChange={(e) => setShowTerrain(e.target.checked)}
                  className="accent-black"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-medium inline-flex items-center gap-1">
                  <Box className="w-3 h-3" />
                  3D Buildings (z≥13)
                </span>
                <input
                  type="checkbox"
                  checked={showBuildings}
                  onChange={(e) => setShowBuildings(e.target.checked)}
                  className="accent-black"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-medium">Recorded Indicators</span>
                <input
                  type="checkbox"
                  checked={showIndicators}
                  onChange={(e) => setShowIndicators(e.target.checked)}
                  className="accent-black"
                />
              </label>
            </div>
          )}
        </div>

        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className={`inline-flex items-center gap-1 border border-black px-2 py-1 text-[11px] font-semibold uppercase tracking-wider cursor-pointer ${
              isFullscreen
                ? 'bg-black text-white hover:bg-neutral-800'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
            title={
              isFullscreen ? 'Exit Fullscreen Map (Esc)' : 'Fullscreen Map'
            }
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit Full</span>
              </>
            ) : (
              <>
                <Expand className="w-3.5 h-3.5" />
                <span>Full Map</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Bottom-left Cartographic Legend */}
      <div className="hidden sm:block absolute bottom-3 left-3 z-10 border border-black bg-white/95 px-2.5 py-1.5 text-[10px] uppercase tracking-wider space-y-1">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-2.5 border border-black bg-black/20" />
          <span>Public CEQA / CalVTP</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-2.5 border border-black bg-amber-600/35" />
          <span>Private Recorded (CCED / CalTREES)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-2.5 border border-black bg-red-600/35" />
          <span>Closed / Completely Private</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 border border-black" />
          <span>Committed Jan CCC · Right-drag to tilt/rotate</span>
        </div>
      </div>
    </div>
  );
}
