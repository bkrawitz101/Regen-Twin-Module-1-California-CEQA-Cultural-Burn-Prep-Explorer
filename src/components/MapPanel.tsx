import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';
import { Maximize2, Moon, Sun } from 'lucide-react';
import type { FeatureCollection, Geometry } from 'geojson';
import { createRadiusCircle } from '../lib/spatial';
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
  origin: OriginPoint;
  searchMode: SearchMode;
  radiusMiles: number;
  focusTrigger: number;
}

const CARTO_LIGHT_STYLE =
  'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const CARTO_DARK_STYLE =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const OFFLINE_FALLBACK_STYLE = (
  theme: BasemapTheme
): maplibregl.StyleSpecification => ({
  version: 8,
  name: 'Offline Editorial Fallback',
  sources: {},
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': theme === 'dark' ? '#0d0d0d' : '#f4f4f2',
      },
    },
  ],
});

export function MapPanel({
  projects,
  crmRecords,
  selectedProjectId,
  onSelectProject,
  origin,
  searchMode,
  radiusMiles,
  focusTrigger,
}: MapPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [basemap, setBasemap] = useState<BasemapTheme>('light');
  const [styleReady, setStyleReady] = useState(false);

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

  // Keep latest callback/map lookup in refs for MapLibre event handlers
  const selectRef = useRef(onSelectProject);
  selectRef.current = onSelectProject;
  const projectsByIdRef = useRef(projectsById);
  projectsByIdRef.current = projectsById;

  const ensureLayers = (map: maplibregl.Map, theme: BasemapTheme) => {
    const stroke = theme === 'dark' ? '#ffffff' : '#000000';
    const fill = theme === 'dark' ? '#ffffff' : '#111111';
    const pointFill = theme === 'dark' ? '#ffffff' : '#000000';
    const pointStroke = theme === 'dark' ? '#000000' : '#ffffff';

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

    if (!map.getLayer('radius-fill')) {
      map.addLayer({
        id: 'radius-fill',
        type: 'fill',
        source: 'origin-radius',
        paint: {
          'fill-color': fill,
          'fill-opacity': 0.04,
        },
      });
    }
    if (!map.getLayer('radius-line')) {
      map.addLayer({
        id: 'radius-line',
        type: 'line',
        source: 'origin-radius',
        paint: {
          'line-color': stroke,
          'line-width': 1.5,
          'line-dasharray': [4, 3],
        },
      });
    }

    if (!map.getLayer('projects-poly-fill')) {
      map.addLayer({
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
            fill,
          ],
          'fill-opacity': [
            'case',
            ['==', ['get', 'isSelected'], 1],
            0.45,
            [
              '==',
              ['get', 'outreachStatus'],
              'Committed for Jan CCC App',
            ],
            0.35,
            0.18,
          ],
        },
      });
    }

    if (!map.getLayer('projects-poly-outline')) {
      map.addLayer({
        id: 'projects-poly-outline',
        type: 'line',
        source: 'projects-poly',
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'isSelected'], 1],
            theme === 'dark' ? '#facc15' : '#000000',
            stroke,
          ],
          'line-width': ['case', ['==', ['get', 'isSelected'], 1], 2.5, 1],
        },
      });
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

  // Initialize MapLibre once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: CARTO_LIGHT_STYLE,
      center: [-120.7, 38.8],
      zoom: 6.1,
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 10,
    });
    popupRef.current = popup;

    map.on('error', () => {
      // If Carto tiles fail offline, switch gracefully to monochrome grid fallback
      if (!map.isStyleLoaded()) {
        map.setStyle(OFFLINE_FALLBACK_STYLE(basemap));
      }
    });

    map.on('style.load', () => {
      ensureLayers(map, basemap);
      setStyleReady(true);
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
          `<div style="font-size:11px;line-height:1.35;color:#000;max-width:240px;">
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

    mapRef.current = map;

    return () => {
      popup.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle basemap theme switching
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    setStyleReady(false);
    map.setStyle(
      basemap === 'dark' ? CARTO_DARK_STYLE : CARTO_LIGHT_STYLE
    );
  }, [basemap]);

  // Sync GeoJSON sources when data/filters/selection update
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) return;
    ensureLayers(map, basemap);

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
  }, [styleReady, basemap, polygonFc, pointFc, radiusFc, originFc]);

  // Fly to selected site when explicitly triggered
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedProjectId || focusTrigger === 0) return;
    const proj = projectsById.get(selectedProjectId);
    if (!proj) return;
    try {
      if (proj.geometry.type === 'Point') {
        map.flyTo({ center: proj.centroid, zoom: 11, duration: 700 });
      } else {
        const bbox = turf.bbox(turf.feature(proj.geometry)) as [
          number,
          number,
          number,
          number,
        ];
        map.fitBounds(bbox, { padding: 60, maxZoom: 12.5, duration: 700 });
      }
    } catch {
      map.flyTo({ center: proj.centroid, zoom: 10, duration: 700 });
    }
  }, [focusTrigger]);

  const handleFitFiltered = () => {
    const map = mapRef.current;
    if (!map || projects.length === 0) return;
    try {
      const fc: FeatureCollection = {
        type: 'FeatureCollection',
        features: projects.map((p) => turf.point(p.centroid)),
      };
      const bbox = turf.bbox(fc) as [number, number, number, number];
      map.fitBounds(bbox, { padding: 48, maxZoom: 10.5, duration: 600 });
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative h-full w-full bg-neutral-100 border-b lg:border-b-0 lg:border-r border-black">
      <div ref={containerRef} className="h-full w-full" />

      {/* Top-left Map Controls */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setBasemap((b) => (b === 'light' ? 'dark' : 'light'))}
          className="inline-flex items-center gap-1.5 border border-black bg-white text-black px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
        >
          {basemap === 'light' ? (
            <>
              <Moon className="w-3.5 h-3.5" />
              <span>Dark Basemap</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5" />
              <span>Light Basemap</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleFitFiltered}
          className="inline-flex items-center gap-1 border border-black bg-white text-black px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
          title="Zoom map to fit all filtered projects"
        >
          <Maximize2 className="w-3 h-3" />
          <span>Fit ({projects.length})</span>
        </button>
      </div>

      {/* Bottom-left Cartographic Legend */}
      <div className="absolute bottom-3 left-3 z-10 border border-black bg-white/95 px-2.5 py-1.5 text-[10px] uppercase tracking-wider space-y-1">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-2.5 border border-black bg-black/20" />
          <span>CalVTP Boundary Polygon</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-black border border-white ring-1 ring-black" />
          <span>Proposed / CEQAnet Site</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 border border-black" />
          <span>Committed for Jan CCC</span>
        </div>
      </div>
    </div>
  );
}
