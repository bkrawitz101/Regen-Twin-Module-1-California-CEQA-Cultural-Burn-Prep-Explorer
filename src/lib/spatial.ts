import * as turf from '@turf/turf';
import type { Feature, Geometry, MultiPolygon, Polygon } from 'geojson';
import type { CeqaPathway, TreatmentCategory } from '../types';

export function computeGeometryCentroid(geometry: Geometry): [number, number] {
  try {
    if (geometry.type === 'Point') {
      return [geometry.coordinates[0], geometry.coordinates[1]];
    }
    const feat = turf.feature(geometry);
    const c = turf.centroid(feat);
    return [c.geometry.coordinates[0], c.geometry.coordinates[1]];
  } catch {
    return [-120.5, 38.5];
  }
}

export function computeDistanceMiles(
  origin: [number, number],
  geometry: Geometry,
  centroid: [number, number]
): number {
  const originPt = turf.point(origin);

  try {
    if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
      const polyFeature = turf.feature(geometry) as Feature<Polygon | MultiPolygon>;
      if (turf.booleanPointInPolygon(originPt, polyFeature)) {
        return 0;
      }
      const line = turf.polygonToLine(polyFeature);
      let minDist = Infinity;
      if (line.type === 'FeatureCollection') {
        for (const f of line.features) {
          const snapped = turf.nearestPointOnLine(f, originPt, { units: 'miles' });
          const d = snapped.properties?.dist;
          if (typeof d === 'number' && d < minDist) minDist = d;
        }
      } else {
        const snapped = turf.nearestPointOnLine(line, originPt, { units: 'miles' });
        if (typeof snapped.properties?.dist === 'number') {
          minDist = snapped.properties.dist;
        }
      }
      if (Number.isFinite(minDist)) {
        return Math.round(minDist * 10) / 10;
      }
    }
  } catch {
    // Fallback to centroid distance
  }

  const d = turf.distance(originPt, turf.point(centroid), { units: 'miles' });
  return Math.round(d * 10) / 10;
}

export function createRadiusCircle(
  origin: [number, number],
  radiusMiles: number
) {
  return turf.circle(origin, Math.max(1, radiusMiles), {
    steps: 72,
    units: 'miles',
  });
}

export function classifyTreatmentCategories(params: {
  rawTypes?: (string | null | undefined)[];
  rxBroadcastAcres?: number;
  rxPileAcres?: number;
  manualAcres?: number;
  mechanicalAcres?: number;
  text?: string;
}): TreatmentCategory[] {
  const categories = new Set<TreatmentCategory>();
  const joined = [
    ...(params.rawTypes ?? []).filter(Boolean),
    params.text ?? '',
  ]
    .join(' ')
    .toLowerCase();

  if (
    (params.rxBroadcastAcres ?? 0) > 0 ||
    (params.rxPileAcres ?? 0) > 0 ||
    /\b(prescribed|rx|broadcast|cultural burn|pile burn|underburn|burn)\b/.test(joined)
  ) {
    categories.add('Prescribed/Cultural Burn');
  }

  if (
    (params.manualAcres ?? 0) > 0 ||
    /\b(manual|hand[- ]?crew|hand[- ]?thin|lop and scatter|brush|wui|ecological restoration)\b/.test(
      joined
    )
  ) {
    categories.add('Manual Hand-Crew Prep');
  }

  if (
    (params.mechanicalAcres ?? 0) > 0 ||
    /\b(fuel ?break|shaded|mechanical|corridor|ridge)\b/.test(joined)
  ) {
    categories.add('Shaded Fuel Break');
  }

  if (categories.size === 0) {
    categories.add('Manual Hand-Crew Prep');
  }

  return Array.from(categories);
}

export function classifyCeqaPathway(params: {
  documentType?: string;
  exemptStatus?: string;
  title?: string;
  description?: string;
  defaultPathway?: CeqaPathway;
}): CeqaPathway {
  const text = [
    params.documentType,
    params.exemptStatus,
    params.title,
    params.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/\b(calvtp|peir|psa|programmatic)\b/.test(text)) {
    return 'CalVTP Certified';
  }
  if (/\b(serp|21080\.56|21080\.26|statutory exemption for restoration)\b/.test(text)) {
    return 'SERP Statutory Exemption';
  }
  if (/\b(ab ?211|4799\.05|prc ?4799)\b/.test(text)) {
    return 'AB 211 / PRC 4799.05';
  }
  if (/\b(class ?4|15304|minor alteration|noe|notice of exemption)\b/.test(text)) {
    return 'Class 4 NOE';
  }

  return params.defaultPathway ?? 'Class 4 NOE';
}
