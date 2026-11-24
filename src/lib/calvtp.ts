import type { Feature, FeatureCollection, Geometry } from 'geojson';
import {
  THREE_SUNS_COORDS,
  inferNearestCounty,
  normalizeCountyName,
} from '../data/caCounties';
import type { SpatialProject } from '../types';
import {
  classifyTreatmentCategories,
  computeDistanceMiles,
  computeGeometryCentroid,
} from './spatial';

const ARCGIS_BASE =
  'https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services';

const BOUNDARIES_PATH =
  '/CalVTP_Project_Boundary_EDIT_CalVTP_Project_Boundaries_1/FeatureServer/0';
const PROPOSED_PATH =
  '/Cal_VTP_Proposed_Projects_PUBLIC_VIEW/FeatureServer/0';
const TREATMENTS_PATH =
  '/CalVTP_treatement_areas_public_view/FeatureServer/0';

const TREATMENT_TYPE_DOMAIN: Record<string, string> = {
  '1': 'Fuel Break',
  '2': 'WUI',
  '3': 'Ecological Restoration',
};

export interface CalvtpSyncResult {
  projects: SpatialProject[];
  sourceMode: 'live' | 'cached-idb' | 'offline-fallback';
  fetchedAt: string;
  boundaryCount: number;
  proposedCount: number;
}

interface RawCalvtpCache {
  fetchedAt: string;
  boundaries: FeatureCollection<Geometry, Record<string, unknown>>;
  proposed: FeatureCollection<Geometry, Record<string, unknown>>;
  projectCounties: Record<string, string[]>;
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 12000): Promise<unknown> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${url}`);
    }
    return await res.json();
  } finally {
    window.clearTimeout(timer);
  }
}

async function fetchLayerGeoJson(
  servicePath: string,
  maxAllowableOffset: number
): Promise<Feature<Geometry, Record<string, unknown>>[]> {
  const all: Feature<Geometry, Record<string, unknown>>[] = [];
  let offset = 0;

  while (true) {
    const qs = new URLSearchParams({
      where: '1=1',
      outFields: '*',
      returnGeometry: 'true',
      geometryPrecision: '5',
      ...(maxAllowableOffset > 0
        ? { maxAllowableOffset: String(maxAllowableOffset) }
        : {}),
      resultOffset: String(offset),
      resultRecordCount: '200',
      f: 'geojson',
    }).toString();

    let data: FeatureCollection<Geometry, Record<string, unknown>> & {
      exceededTransferLimit?: boolean;
    };

    if (import.meta.env.DEV) {
      try {
        data = (await fetchJsonWithTimeout(
          `/api/calvtp${servicePath}/query?${qs}`,
          12000
        )) as typeof data;
      } catch {
        data = (await fetchJsonWithTimeout(
          `${ARCGIS_BASE}${servicePath}/query?${qs}`,
          14000
        )) as typeof data;
      }
    } else {
      data = (await fetchJsonWithTimeout(
        `${ARCGIS_BASE}${servicePath}/query?${qs}`,
        14000
      )) as typeof data;
    }

    const batch = data.features ?? [];
    all.push(...batch);
    if (batch.length < 200 && !data.exceededTransferLimit) {
      break;
    }
    offset += batch.length;
    if (offset > 3000) break;
  }

  return all;
}

async function fetchProjectCountyLookup(): Promise<Record<string, string[]>> {
  const map: Record<string, Set<string>> = {};
  let offset = 0;

  while (true) {
    const qs = new URLSearchParams({
      where: '1=1',
      outFields: 'Project_ID,County',
      returnGeometry: 'false',
      resultOffset: String(offset),
      resultRecordCount: '1000',
      f: 'json',
    }).toString();

    let data: {
      features?: Array<{ attributes?: { Project_ID?: string; County?: string } }>;
      exceededTransferLimit?: boolean;
    };

    if (import.meta.env.DEV) {
      try {
        data = (await fetchJsonWithTimeout(
          `/api/calvtp${TREATMENTS_PATH}/query?${qs}`,
          10000
        )) as typeof data;
      } catch {
        data = (await fetchJsonWithTimeout(
          `${ARCGIS_BASE}${TREATMENTS_PATH}/query?${qs}`,
          12000
        )) as typeof data;
      }
    } else {
      data = (await fetchJsonWithTimeout(
        `${ARCGIS_BASE}${TREATMENTS_PATH}/query?${qs}`,
        12000
      )) as typeof data;
    }

    for (const f of data.features ?? []) {
      const pid = f.attributes?.Project_ID;
      const cnty = normalizeCountyName(f.attributes?.County);
      if (pid && cnty) {
        if (!map[pid]) map[pid] = new Set();
        map[pid].add(cnty);
      }
    }

    if (!data.exceededTransferLimit) break;
    offset += (data.features ?? []).length;
    if (offset > 10000) break;
  }

  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(map)) {
    out[k] = Array.from(v).sort();
  }
  return out;
}

function decodeTreatmentType(val: unknown): string | null {
  if (!val || val === '<Null>' || val === 'null') return null;
  const s = String(val).trim();
  return TREATMENT_TYPE_DOMAIN[s] ?? s;
}

function formatEpochDate(val: unknown): string {
  if (typeof val !== 'number' || !Number.isFinite(val)) return '—';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toISOString().slice(0, 10);
}

function num(val: unknown): number {
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 10) / 10 : 0;
}

function str(val: unknown): string {
  if (val === null || val === undefined || val === '<Null>') return '';
  return String(val).trim();
}

export function normalizeCalvtpFeatures(
  raw: RawCalvtpCache,
  originCoords: [number, number] = THREE_SUNS_COORDS
): { projects: SpatialProject[]; boundaryCount: number; proposedCount: number } {
  const projects: SpatialProject[] = [];
  const seenProjectIds = new Set<string>();
  let boundaryCount = 0;
  let proposedCount = 0;

  for (const feat of raw.boundaries.features ?? []) {
    if (!feat.geometry) continue;
    const p = feat.properties ?? {};
    const projectId = str(p.ProjectID) || `CALVTP-B-${str(p.OBJECTID)}`;
    seenProjectIds.add(projectId);
    boundaryCount += 1;

    const centroid = computeGeometryCentroid(feat.geometry);
    const mappedCounties = raw.projectCounties?.[projectId] ?? [];
    const primaryCounty =
      mappedCounties[0] ?? inferNearestCounty(centroid[0], centroid[1]);
    const counties = mappedCounties.length > 0 ? mappedCounties : [primaryCounty];

    const rawTypes = [
      decodeTreatmentType(p.TreatmentType1),
      decodeTreatmentType(p.TreatmentType2),
      decodeTreatmentType(p.TreatmentType3),
    ].filter((x): x is string => Boolean(x));

    const rxBroadcastAcres = num(p.RxBroadcastBurnAcres);
    const rxPileAcres = num(p.RxFirePileBurnAcres);
    const manualAcres = num(p.ManualTreatmentAcres);
    const mechanicalAcres = num(p.MechanicalTreatmentAcres);
    const totalAcres = num(p.TotalAcres);

    const status = str(p.Status) || 'Approved';
    const comments = str(p.Comments);
    const treatmentCategories = classifyTreatmentCategories({
      rawTypes,
      rxBroadcastAcres,
      rxPileAcres,
      manualAcres,
      mechanicalAcres,
      text: `${str(p.ProjectName)} ${comments}`,
    });

    const d3Suns = computeDistanceMiles(THREE_SUNS_COORDS, feat.geometry, centroid);
    const dOrigin = computeDistanceMiles(originCoords, feat.geometry, centroid);

    projects.push({
      id: `calvtp-b-${projectId}-${str(p.OBJECTID)}`,
      schNumber: projectId,
      title: str(p.ProjectName) || `CalVTP Project ${projectId}`,
      source: 'CalVTP Approved/Active',
      privacyScope: 'public',
      accessLabel: 'Public CEQA / CalVTP',
      status,
      leadAgency: str(p.Organization) || str(p.Affiliation) || 'CAL FIRE / Partner',
      county: primaryCounty,
      counties,
      ceqaPathway: 'CalVTP Certified',
      documentType: 'CalVTP PSA / PEIR',
      exemptStatus: `CalVTP Project-Specific Analysis (${status})`,
      treatmentCategories,
      rawTreatmentTypes: rawTypes,
      totalAcres,
      rxBroadcastAcres,
      rxPileAcres,
      manualAcres,
      mechanicalAcres,
      contactName: str(p.ContactName),
      contactEmail: str(p.ContactEmail),
      contactPhone: str(p.ContactNumber),
      contactAddress: str(p.ContactAddress),
      psaLink: str(p.PSALink),
      description:
        comments ||
        `CalVTP ${status} boundary (${rawTypes.join(', ') || 'Vegetation Treatment'}) — ${totalAcres.toLocaleString()} ac.`,
      dateLabel: formatEpochDate(p.DateCertified ?? p.DateProposed),
      centroid,
      geometry: feat.geometry,
      distanceFromThreeSunsMiles: d3Suns,
      distanceFromOriginMiles: dOrigin,
      geocodePrecision: 'exact',
    });
  }

  for (const feat of raw.proposed.features ?? []) {
    if (!feat.geometry) continue;
    const p = feat.properties ?? {};
    const projectId = str(p.ProjectID) || `CALVTP-P-${str(p.OBJECTID)}`;
    if (seenProjectIds.has(projectId)) continue;
    proposedCount += 1;

    const centroid = computeGeometryCentroid(feat.geometry);
    const mappedCounties = raw.projectCounties?.[projectId] ?? [];
    const primaryCounty =
      mappedCounties[0] ?? inferNearestCounty(centroid[0], centroid[1]);
    const counties = mappedCounties.length > 0 ? mappedCounties : [primaryCounty];

    const rawTypes = [
      decodeTreatmentType(p.TreatmentType1),
      decodeTreatmentType(p.TreatmentType2),
      decodeTreatmentType(p.TreatmentType3),
    ].filter((x): x is string => Boolean(x));

    const rxBroadcastAcres = num(p.RxBroadcastBurnAcres);
    const rxPileAcres = num(p.RxFirePileBurnAcres);
    const manualAcres = num(p.ManualTreatmentAcres);
    const mechanicalAcres = num(p.MechanicalTreatmentAcres);
    const totalAcres = num(p.TotalAcres);

    const status = str(p.Status) || 'Proposed';
    const comments = str(p.Comments);
    const treatmentCategories = classifyTreatmentCategories({
      rawTypes,
      rxBroadcastAcres,
      rxPileAcres,
      manualAcres,
      mechanicalAcres,
      text: `${str(p.ProjectName)} ${comments}`,
    });

    const d3Suns = computeDistanceMiles(THREE_SUNS_COORDS, feat.geometry, centroid);
    const dOrigin = computeDistanceMiles(originCoords, feat.geometry, centroid);

    projects.push({
      id: `calvtp-p-${projectId}-${str(p.OBJECTID)}`,
      schNumber: projectId,
      title: str(p.ProjectName) || `CalVTP Proposed ${projectId}`,
      source: 'CalVTP Proposed',
      privacyScope: 'public',
      accessLabel: 'Public CEQA / CalVTP Proposed',
      status,
      leadAgency: str(p.Organization) || 'CAL FIRE / Partner',
      county: primaryCounty,
      counties,
      ceqaPathway: 'CalVTP Certified',
      documentType: 'CalVTP Proposed PSA',
      exemptStatus: `CalVTP ${status}`,
      treatmentCategories,
      rawTreatmentTypes: rawTypes,
      totalAcres,
      rxBroadcastAcres,
      rxPileAcres,
      manualAcres,
      mechanicalAcres,
      contactName: str(p.ContactName),
      contactEmail: str(p.ContactEmail),
      contactPhone: str(p.ContactPhone),
      contactAddress: str(p.ContactAddress),
      psaLink: '',
      description:
        comments ||
        `CalVTP ${status} project (${rawTypes.join(', ') || 'Vegetation Treatment'}) — ${totalAcres.toLocaleString()} ac.`,
      dateLabel: formatEpochDate(p.Date_),
      centroid,
      geometry: feat.geometry,
      distanceFromThreeSunsMiles: d3Suns,
      distanceFromOriginMiles: dOrigin,
      geocodePrecision: 'exact',
    });
  }

  return { projects, boundaryCount, proposedCount };
}

export async function fetchLiveCalvtpRaw(): Promise<RawCalvtpCache> {
  const [boundaries, proposed, projectCounties] = await Promise.all([
    fetchLayerGeoJson(BOUNDARIES_PATH, 0.0005),
    fetchLayerGeoJson(PROPOSED_PATH, 0),
    fetchProjectCountyLookup(),
  ]);

  return {
    fetchedAt: new Date().toISOString(),
    boundaries: { type: 'FeatureCollection', features: boundaries },
    proposed: { type: 'FeatureCollection', features: proposed },
    projectCounties,
  };
}

export async function fetchOfflineFallbackRaw(): Promise<RawCalvtpCache> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/calvtp-cache.json`);
  if (!res.ok) {
    throw new Error(`Failed to load offline CalVTP fallback (${res.status})`);
  }
  return (await res.json()) as RawCalvtpCache;
}
