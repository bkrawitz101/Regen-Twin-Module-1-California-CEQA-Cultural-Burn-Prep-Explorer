import * as turf from '@turf/turf';
import { get, set } from 'idb-keyval';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { SpatialProject } from '../types';

export type IndicatorLayerStatus =
  | 'loading'
  | 'recorded'
  | 'none'
  | 'unavailable';

export interface CcedIndicatorItem {
  id: string;
  sitename: string;
  esmthldr: string;
  heldlevel: string;
  year_est: string;
  gis_acres: number;
  pubaccess: string;
  duration: string;
  badgeText: string;
}

export interface CalFirePlanIndicatorItem {
  id: string;
  sourceLabel: 'CalVTP' | 'CalTREES THP' | 'CalTREES Exemption';
  projectName: string;
  planNumber: string;
  leadAgency: string;
  status: string;
  approvalDate: string;
  treatmentType: string;
  badgeText: string;
}

export interface CeqanetIndicatorItem {
  id: string;
  schNumber: string;
  documentType: string;
  leadAgency: string;
  title: string;
  receivedDate: string;
  lookupUrl: string;
  badgeText: string;
}

export interface AceSpeciesIndicatorItem {
  id: string;
  quadName: string;
  hexId: string;
  rareRank: string;
  rareCount: number;
  taxonomicSummary: string;
  ecoName: string;
  badgeText: string;
}

export interface LayerResult<T> {
  status: IndicatorLayerStatus;
  items: T[];
  cachedAt?: string;
  fromCache?: boolean;
  error?: string;
}

export interface RecordedIndicatorsBundle {
  projectId: string;
  cced: LayerResult<CcedIndicatorItem>;
  calfire: LayerResult<CalFirePlanIndicatorItem>;
  ceqanet: LayerResult<CeqanetIndicatorItem>;
  ace: LayerResult<AceSpeciesIndicatorItem>;
}

const CCED_URL =
  'https://services2.arcgis.com/Uq9r85Potqm3MfRV/arcgis/rest/services/CCED_wm/FeatureServer/0/query';
const CALVTP_BOUNDARIES_URL =
  'https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/CalVTP_Project_Boundary_EDIT_CalVTP_Project_Boundaries_1/FeatureServer/0/query';
const CALTREES_THP_URL =
  'https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/CAL_FIRE_Timber_Harvest_Plans_Service_view_Public/FeatureServer/0/query';
const CALTREES_EXEMPT_URL =
  'https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/CAL_FIRE_Exemption_Notices_Service_view_Public/FeatureServer/0/query';
const CDFW_ACE_RARE_URL =
  'https://services2.arcgis.com/Uq9r85Potqm3MfRV/arcgis/rest/services/biosds1333_fpu/FeatureServer/0/query';
const TNM_QUAD_URL =
  'https://carto.nationalmap.gov/arcgis/rest/services/map_indices/MapServer/10/query';

const CACHE_PREFIX = 'regen_twin_indicators_v1_';
const memoryCache = new Map<string, RecordedIndicatorsBundle>();

function str(val: unknown): string {
  if (val === null || val === undefined || val === '<Null>') return '';
  return String(val).trim();
}

function num(val: unknown): number {
  const n = Number(val);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
}

function formatDate(val: unknown): string {
  if (typeof val === 'number' && Number.isFinite(val)) {
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? '—' : d.toISOString().slice(0, 10);
  }
  const s = str(val);
  return s || '—';
}

function getQueryGeometry(project: SpatialProject): {
  footprint: Feature<Geometry>;
  bboxStr: string;
} {
  const rawFeat = turf.feature(project.geometry);
  // Points (e.g. CEQAnet or Proposed CalVTP points) get a 0.5-mile parcel-proxy buffer
  // so intersecting easements, THPs, and quads are accurately detected.
  const footprint: Feature<Geometry> =
    project.geometry.type === 'Point'
      ? (turf.buffer(rawFeat, 0.5, { units: 'miles' }) as Feature<Geometry>)
      : rawFeat;

  const [minX, minY, maxX, maxY] = turf.bbox(footprint);
  const pad = 0.002;
  const bboxStr = `${(minX - pad).toFixed(5)},${(minY - pad).toFixed(5)},${(
    maxX + pad
  ).toFixed(5)},${(maxY + pad).toFixed(5)}`;

  return { footprint, bboxStr };
}

function safeIntersects(
  footprint: Feature<Geometry>,
  candidate: Feature<Geometry>
): boolean {
  try {
    return turf.booleanIntersects(footprint, candidate);
  } catch {
    return true;
  }
}

async function fetchArcGisGeoJson(
  endpoint: string,
  bboxStr: string,
  outFields = '*',
  timeoutMs = 10000
): Promise<FeatureCollection<Geometry, Record<string, unknown>>> {
  const qs = new URLSearchParams({
    where: '1=1',
    geometry: bboxStr,
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields,
    returnGeometry: 'true',
    geometryPrecision: '5',
    resultRecordCount: '50',
    f: 'geojson',
  }).toString();

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${endpoint}?${qs}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as FeatureCollection<
      Geometry,
      Record<string, unknown>
    >;
  } finally {
    window.clearTimeout(timer);
  }
}

async function fetchQuadNames(
  bboxStr: string,
  timeoutMs = 8000
): Promise<string[]> {
  const qs = new URLSearchParams({
    where: '1=1',
    geometry: bboxStr,
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'CELL_NAME,PRIMARY_STATE',
    returnGeometry: 'false',
    resultRecordCount: '12',
    f: 'json',
  }).toString();

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${TNM_QUAD_URL}?${qs}`, {
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      features?: Array<{ attributes?: { CELL_NAME?: string } }>;
    };
    const names = (data.features ?? [])
      .map((f) => str(f.attributes?.CELL_NAME))
      .filter(Boolean);
    return Array.from(new Set(names));
  } catch {
    return [];
  } finally {
    window.clearTimeout(timer);
  }
}

export async function queryCcedLayer(
  project: SpatialProject
): Promise<LayerResult<CcedIndicatorItem>> {
  const { footprint, bboxStr } = getQueryGeometry(project);
  const fc = await fetchArcGisGeoJson(
    CCED_URL,
    bboxStr,
    'e_hold_id,sitename,esmthldr,eholdtyp,year_est,gis_acres,pubaccess,duration'
  );

  const items: CcedIndicatorItem[] = [];
  const seen = new Set<string>();

  for (const feat of fc.features ?? []) {
    if (!feat.geometry || !safeIntersects(footprint, feat)) continue;
    const p = feat.properties ?? {};
    const sitename = str(p.sitename) || 'Unnamed Conservation Easement';
    const esmthldr = str(p.esmthldr) || 'Private / Land Trust Holder';
    const key = `${sitename}::${esmthldr}`;
    if (seen.has(key)) continue;
    seen.add(key);

    items.push({
      id: `cced-${str(p.e_hold_id) || items.length}`,
      sitename,
      esmthldr,
      heldlevel: str(p.eholdtyp) || 'Unknown',
      year_est: str(p.year_est) || '—',
      gis_acres: num(p.gis_acres),
      pubaccess: str(p.pubaccess) || 'Restricted',
      duration: str(p.duration) || 'Permanent',
      badgeText: `Conservation Easement Recorded — Held by ${esmthldr} (Baseline Ecological Report on File)`,
    });
  }

  return {
    status: items.length > 0 ? 'recorded' : 'none',
    items,
    cachedAt: new Date().toISOString(),
  };
}

export async function queryCalFireLayer(
  project: SpatialProject
): Promise<LayerResult<CalFirePlanIndicatorItem>> {
  const { footprint, bboxStr } = getQueryGeometry(project);
  const items: CalFirePlanIndicatorItem[] = [];
  const seen = new Set<string>();

  const [calvtpRes, thpRes, exemptRes] = await Promise.allSettled([
    fetchArcGisGeoJson(
      CALVTP_BOUNDARIES_URL,
      bboxStr,
      'OBJECTID,ProjectName,ProjectID,Organization,Status,DateCertified,TreatmentType1'
    ),
    fetchArcGisGeoJson(
      CALTREES_THP_URL,
      bboxStr,
      'OBJECTID,PROJECT_NAME,HD_NUM,TIMBEROWNR,LANDOWNER,PLAN_STAT,APPROVED,SILVI_1,SILVI_CAT'
    ),
    fetchArcGisGeoJson(
      CALTREES_EXEMPT_URL,
      bboxStr,
      'OBJECTID,HD_NUM,LANDOWNER,EX_TYPE,ACCEPTED,COMPLETED'
    ),
  ]);

  let anySucceeded = false;

  if (calvtpRes.status === 'fulfilled') {
    anySucceeded = true;
    for (const feat of calvtpRes.value.features ?? []) {
      if (!feat.geometry || !safeIntersects(footprint, feat)) continue;
      const p = feat.properties ?? {};
      const projectName =
        str(p.ProjectName) || `CalVTP ${str(p.ProjectID)}`;
      const planNumber = str(p.ProjectID) || `CALVTP-${str(p.OBJECTID)}`;
      if (seen.has(planNumber)) continue;
      seen.add(planNumber);

      items.push({
        id: `calvtp-${planNumber}`,
        sourceLabel: 'CalVTP',
        projectName,
        planNumber,
        leadAgency: str(p.Organization) || 'CAL FIRE / Partner',
        status: str(p.Status) || 'Approved',
        approvalDate: formatDate(p.DateCertified),
        treatmentType: str(p.TreatmentType1) || 'Vegetation Treatment',
        badgeText: `CAL FIRE / CalVTP Survey Recorded — ${projectName} (Botanical, Soil & Cultural Surveys on File)`,
      });
    }
  }

  if (thpRes.status === 'fulfilled') {
    anySucceeded = true;
    for (const feat of thpRes.value.features ?? []) {
      if (!feat.geometry || !safeIntersects(footprint, feat)) continue;
      const p = feat.properties ?? {};
      const planNumber = str(p.HD_NUM) || `THP-${str(p.OBJECTID)}`;
      const projectName = str(p.PROJECT_NAME) || `CalTREES THP ${planNumber}`;
      if (seen.has(planNumber)) continue;
      seen.add(planNumber);

      items.push({
        id: `thp-${planNumber}`,
        sourceLabel: 'CalTREES THP',
        projectName,
        planNumber,
        leadAgency:
          str(p.TIMBEROWNR) || str(p.LANDOWNER) || 'CAL FIRE Forest Practice',
        status: str(p.PLAN_STAT) || 'Approved',
        approvalDate: formatDate(p.APPROVED),
        treatmentType:
          str(p.SILVI_1) || str(p.SILVI_CAT) || 'Timber Harvest Plan',
        badgeText: `CAL FIRE / CalVTP Survey Recorded — ${projectName} (${planNumber}) (Botanical, Soil & Cultural Surveys on File)`,
      });
    }
  }

  if (exemptRes.status === 'fulfilled') {
    anySucceeded = true;
    for (const feat of exemptRes.value.features ?? []) {
      if (!feat.geometry || !safeIntersects(footprint, feat)) continue;
      const p = feat.properties ?? {};
      const planNumber = str(p.HD_NUM) || `EX-${str(p.OBJECTID)}`;
      const projectName = `CalTREES Exemption ${planNumber}`;
      if (seen.has(planNumber)) continue;
      seen.add(planNumber);

      items.push({
        id: `exempt-${planNumber}`,
        sourceLabel: 'CalTREES Exemption',
        projectName,
        planNumber,
        leadAgency: str(p.LANDOWNER) || 'CAL FIRE Forest Practice',
        status: p.COMPLETED ? 'Completed' : 'Accepted',
        approvalDate: formatDate(p.ACCEPTED),
        treatmentType: str(p.EX_TYPE) || 'Forest Practice Exemption',
        badgeText: `CAL FIRE / CalVTP Survey Recorded — ${projectName} (Botanical, Soil & Cultural Surveys on File)`,
      });
    }
  }

  if (!anySucceeded) {
    throw new Error('CAL FIRE CalVTP / CalTREES services unreachable');
  }

  return {
    status: items.length > 0 ? 'recorded' : 'none',
    items,
    cachedAt: new Date().toISOString(),
  };
}

export function queryCeqanetLocalCrossRef(
  project: SpatialProject,
  allProjects: SpatialProject[]
): LayerResult<CeqanetIndicatorItem> {
  const { footprint } = getQueryGeometry(project);
  const items: CeqanetIndicatorItem[] = [];
  const seen = new Set<string>();

  const candidates = allProjects.filter((candidate) => {
    const isCeqaRecord =
      candidate.source === 'CEQAnet Import' ||
      /^\d{10}$/.test(candidate.schNumber) ||
      candidate.id === project.id;
    if (!isCeqaRecord) return false;
    if (candidate.id === project.id) return true;

    const candGeom =
      candidate.geometry.type === 'Point'
        ? (turf.buffer(turf.feature(candidate.geometry), 0.5, {
            units: 'miles',
          }) as Feature<Geometry>)
        : turf.feature(candidate.geometry);

    return safeIntersects(footprint, candGeom);
  });

  for (const c of candidates) {
    if (seen.has(c.schNumber)) continue;
    seen.add(c.schNumber);

    const isFormalSch =
      c.source === 'CEQAnet Import' || /^\d{10}$/.test(c.schNumber);
    const docLabel = isFormalSch ? c.documentType : `${c.documentType} (${c.schNumber})`;
    const lookupUrl = /^\d{8,10}$/.test(c.schNumber)
      ? `https://ceqanet.opr.ca.gov/Search?SchNumber=${encodeURIComponent(
          c.schNumber
        )}`
      : `https://ceqanet.opr.ca.gov/Search?County=${encodeURIComponent(
          c.county
        )}`;

    items.push({
      id: `ceqanet-ind-${c.id}`,
      schNumber: c.schNumber,
      documentType: docLabel,
      leadAgency: c.leadAgency,
      title: c.title,
      receivedDate: c.dateLabel,
      lookupUrl,
      badgeText: `CEQA Record Found (SCH #${c.schNumber}) — ${docLabel} via ${c.leadAgency}`,
    });
  }

  return {
    status: items.length > 0 ? 'recorded' : 'none',
    items,
    cachedAt: new Date().toISOString(),
  };
}

export async function queryAceSpeciesLayer(
  project: SpatialProject
): Promise<LayerResult<AceSpeciesIndicatorItem>> {
  const { footprint, bboxStr } = getQueryGeometry(project);

  const [aceFc, quadNames] = await Promise.all([
    fetchArcGisGeoJson(
      CDFW_ACE_RARE_URL,
      bboxStr,
      'Hex_ID,County,Eco_Name,RarRankSW,RarRankEco,RareCount,RarAmph,RarRept,RarBird,RarMamm,RarPlnt'
    ),
    fetchQuadNames(bboxStr),
  ]);

  const items: AceSpeciesIndicatorItem[] = [];
  const seenHex = new Set<string>();
  const primaryQuad = quadNames[0] || `${project.county} County Quad`;

  for (const feat of aceFc.features ?? []) {
    if (!feat.geometry || !safeIntersects(footprint, feat)) continue;
    const p = feat.properties ?? {};
    const hexId = str(p.Hex_ID);
    const rareCount = Number(p.RareCount ?? 0);
    const rareRankSw = Number(p.RarRankSW ?? 0);
    if (!hexId || seenHex.has(hexId)) continue;
    if (rareCount <= 0 && rareRankSw <= 0) continue;
    seenHex.add(hexId);

    const groups: string[] = [];
    if (Number(p.RarPlnt) > 0) groups.push(`${p.RarPlnt} Plant`);
    if (Number(p.RarBird) > 0) groups.push(`${p.RarBird} Bird`);
    if (Number(p.RarMamm) > 0) groups.push(`${p.RarMamm} Mammal`);
    if (Number(p.RarRept) > 0) groups.push(`${p.RarRept} Reptile`);
    if (Number(p.RarAmph) > 0) groups.push(`${p.RarAmph} Amphibian`);

    items.push({
      id: `ace-${hexId}`,
      quadName: primaryQuad,
      hexId,
      rareRank: `Rank ${rareRankSw || 1}/5 (Statewide)`,
      rareCount,
      taxonomicSummary: groups.join(', ') || `${rareCount} Rare Taxa`,
      ecoName: str(p.Eco_Name) || 'California',
      badgeText: `Sensitive Species Recorded in Quad (${primaryQuad}) — CNDDB Institutional Lookup Required`,
    });
  }

  // Sort highest rare species count first
  items.sort((a, b) => b.rareCount - a.rareCount);

  return {
    status: items.length > 0 ? 'recorded' : 'none',
    items: items.slice(0, 4),
    cachedAt: new Date().toISOString(),
  };
}

async function readIndicatorCache(
  projectId: string
): Promise<RecordedIndicatorsBundle | null> {
  const mem = memoryCache.get(projectId);
  if (mem) return mem;
  try {
    const stored = await get<RecordedIndicatorsBundle>(
      `${CACHE_PREFIX}${projectId}`
    );
    if (stored) {
      memoryCache.set(projectId, stored);
      return stored;
    }
  } catch {
    // ignore storage read error
  }
  return null;
}

async function writeIndicatorCache(bundle: RecordedIndicatorsBundle): Promise<void> {
  memoryCache.set(bundle.projectId, bundle);
  try {
    await set(`${CACHE_PREFIX}${bundle.projectId}`, bundle);
  } catch {
    // ignore storage write error
  }
}

export async function fetchAllRecordedIndicators(
  project: SpatialProject,
  allProjects: SpatialProject[],
  forceRefresh = false
): Promise<RecordedIndicatorsBundle> {
  const cached = await readIndicatorCache(project.id);
  if (cached && !forceRefresh) {
    // Refresh CEQAnet local cross-reference immediately in case new CSVs were imported
    const freshCeqanet = queryCeqanetLocalCrossRef(project, allProjects);
    return {
      ...cached,
      ceqanet: freshCeqanet,
    };
  }

  const [ccedRes, calfireRes, aceRes] = await Promise.allSettled([
    queryCcedLayer(project),
    queryCalFireLayer(project),
    queryAceSpeciesLayer(project),
  ]);

  const ceqanet = queryCeqanetLocalCrossRef(project, allProjects);

  const resolveWithCache = <T,>(
    settled: PromiseSettledResult<LayerResult<T>>,
    prevLayer?: LayerResult<T>
  ): LayerResult<T> => {
    if (settled.status === 'fulfilled') {
      return settled.value;
    }
    if (prevLayer && prevLayer.status !== 'unavailable') {
      return { ...prevLayer, fromCache: true };
    }
    return {
      status: 'unavailable',
      items: [],
      error: 'Source Temporarily Unavailable — Retry',
    };
  };

  const bundle: RecordedIndicatorsBundle = {
    projectId: project.id,
    cced: resolveWithCache(ccedRes, cached?.cced),
    calfire: resolveWithCache(calfireRes, cached?.calfire),
    ceqanet,
    ace: resolveWithCache(aceRes, cached?.ace),
  };

  await writeIndicatorCache(bundle);
  return bundle;
}

export async function retrySingleIndicatorLayer(
  layer: 'cced' | 'calfire' | 'ace',
  project: SpatialProject,
  current: RecordedIndicatorsBundle
): Promise<RecordedIndicatorsBundle> {
  let updated: RecordedIndicatorsBundle = current;
  try {
    if (layer === 'cced') {
      const cced = await queryCcedLayer(project);
      updated = { ...current, cced };
    } else if (layer === 'calfire') {
      const calfire = await queryCalFireLayer(project);
      updated = { ...current, calfire };
    } else {
      const ace = await queryAceSpeciesLayer(project);
      updated = { ...current, ace };
    }
    await writeIndicatorCache(updated);
    return updated;
  } catch {
    return {
      ...current,
      [layer]: {
        status: 'unavailable',
        items: [],
        error: 'Source Temporarily Unavailable — Retry',
      },
    };
  }
}

export function buildCpraOutreachRequest(params: {
  project: SpatialProject;
  recipientOrg: string;
  referenceLabel: string;
  studyKind: string;
}): string {
  const { project, recipientOrg, referenceLabel, studyKind } = params;
  return `Subject: California Public Records Act (CPRA) / Ecological Data-Sharing Inquiry — ${referenceLabel} (${project.county} County)

Dear ${recipientOrg} GIS / Stewardship Team,

We are preparing shovel-ready wildfire resilience and cultural burn-prep implementation work in ${project.county} County with Return California and 3 Suns Farm (near ${project.centroid[1].toFixed(
    4
  )}°N, ${Math.abs(project.centroid[0]).toFixed(
    4
  )}°W; site reference ${project.schNumber}).

Publicly recorded spatial metadata indicates ${studyKind} associated with ${referenceLabel}. To avoid duplicating existing fieldwork and ensure full ecological and cultural resource protection prior to hand-crew prep or prescribed burning, we respectfully request non-restricted copies or partner data-sharing access to:
1. Prior botanical, wildlife, soil, or archaeological/cultural survey clearances or management prescriptions (with any sensitive site coordinates appropriately redacted);
2. Current stewardship contact details for coordinating fuels reduction or CCC-supported implementation on or adjacent to this footprint.

If formal institutional authorization or a data-sharing agreement is required (e.g., under Cal. Gov. Code § 7920.000 et seq. or landowner MOU), please let us know the appropriate point of contact.

Thank you,
Return California // 3 Suns Farm Spatial Intelligence Team
13418 McKitrick Ranch Rd, Nevada City, CA 95959`;
}
