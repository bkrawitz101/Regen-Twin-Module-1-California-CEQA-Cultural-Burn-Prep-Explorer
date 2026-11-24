import type { FeatureCollection, Geometry } from 'geojson';
import {
  THREE_SUNS_COORDS,
  inferNearestCounty,
  normalizeCountyName,
} from '../data/caCounties';
import {
  classifyTreatmentCategories,
  computeDistanceMiles,
  computeGeometryCentroid,
} from '../lib/spatial';
import type { PrivacyScope, SpatialProject } from '../types';

const CCED_QUERY =
  'https://services2.arcgis.com/Uq9r85Potqm3MfRV/arcgis/rest/services/CCED_wm/FeatureServer/0/query';
const THP_QUERY =
  'https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/CAL_FIRE_Timber_Harvest_Plans_Service_view_Public/FeatureServer/0/query';
const EXEMPT_QUERY =
  'https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/CAL_FIRE_Exemption_Notices_Service_view_Public/FeatureServer/0/query';

interface RawPrivateCache {
  fetchedAt: string;
  cced: FeatureCollection<Geometry, Record<string, unknown>>;
  thp: FeatureCollection<Geometry, Record<string, unknown>>;
  exempt: FeatureCollection<Geometry, Record<string, unknown>>;
}

function str(val: unknown): string {
  if (val === null || val === undefined || val === '<Null>') return '';
  return String(val).trim();
}

function num(val: unknown): number {
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 10) / 10 : 0;
}

function formatEpochDate(val: unknown): string {
  if (typeof val !== 'number' || !Number.isFinite(val)) return '—';
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? '—' : d.toISOString().slice(0, 10);
}

function classifyCcedPrivacy(
  pubaccess: string,
  eholdtyp: string
): { scope: PrivacyScope; label: string } {
  const pub = pubaccess.toLowerCase();
  const holderType = eholdtyp.toLowerCase();
  if (pub.includes('closed')) {
    return { scope: 'completely_private', label: 'Closed / Private Access' };
  }
  if (
    pub.includes('open') &&
    (holderType.includes('state') ||
      holderType.includes('city') ||
      holderType.includes('county') ||
      holderType.includes('federal') ||
      holderType.includes('district'))
  ) {
    return { scope: 'public', label: 'Open Public Access' };
  }
  return {
    scope: 'private_recorded',
    label: `${pubaccess || 'Restricted'} (${eholdtyp || 'Land Trust'})`,
  };
}

function classifyThpPrivacy(
  landowncat: string
): { scope: PrivacyScope; label: string } {
  const cat = landowncat.toLowerCase();
  if (
    cat.includes('state') ||
    cat.includes('city') ||
    cat.includes('county') ||
    cat.includes('district') ||
    cat.includes('federal')
  ) {
    return { scope: 'public', label: `Public Timberland (${landowncat})` };
  }
  if (cat.includes('small nonindustrial')) {
    return {
      scope: 'completely_private',
      label: 'Private Non-Public (Small Nonindustrial)',
    };
  }
  return {
    scope: 'private_recorded',
    label: landowncat ? `Private Recorded (${landowncat})` : 'Private Recorded THP',
  };
}

export function normalizePrivateRecordedCache(
  raw: RawPrivateCache,
  originCoords: [number, number] = THREE_SUNS_COORDS
): SpatialProject[] {
  const out: SpatialProject[] = [];
  const seen = new Set<string>();

  // 1. CCED Conservation Easements
  for (const feat of raw.cced?.features ?? []) {
    if (!feat.geometry) continue;
    const p = feat.properties ?? {};
    const holdId = str(p.e_hold_id) || String(out.length);
    const id = `cced-site-${holdId}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const centroid = computeGeometryCentroid(feat.geometry);
    const county =
      normalizeCountyName(str(p.county)) ||
      inferNearestCounty(centroid[0], centroid[1]);
    const sitename = str(p.sitename) || `Conservation Easement #${holdId}`;
    const esmthldr = str(p.esmthldr) || 'Private Land Trust';
    const pubaccess = str(p.pubaccess) || 'Restricted Access';
    const eholdtyp = str(p.eholdtyp) || 'NonProfit';
    const { scope, label } = classifyCcedPrivacy(pubaccess, eholdtyp);
    const totalAcres = num(p.gis_acres);

    out.push({
      id,
      schNumber: `CCED-${holdId}`,
      title: sitename,
      source: 'CCED Easement',
      privacyScope: scope,
      accessLabel: label,
      status: pubaccess,
      leadAgency: esmthldr,
      county,
      counties: [county],
      ceqaPathway: 'Class 4 NOE',
      documentType: 'CCED Conservation Easement',
      exemptStatus: `Baseline Ecological Report (${pubaccess})`,
      treatmentCategories: classifyTreatmentCategories({
        text: `${sitename} ecological restoration stewardship`,
      }),
      rawTreatmentTypes: ['Conservation Easement'],
      totalAcres,
      rxBroadcastAcres: 0,
      rxPileAcres: 0,
      manualAcres: 0,
      mechanicalAcres: 0,
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      contactAddress: `${county} County, CA`,
      psaLink: '',
      description: `Recorded Conservation Easement held by ${esmthldr} (${eholdtyp}, est. ${
        str(p.year_est) || '—'
      }, ${str(p.duration) || 'Permanent'}). Access: ${pubaccess}.`,
      dateLabel: str(p.year_est) || 'CCED',
      centroid,
      geometry: feat.geometry,
      distanceFromThreeSunsMiles: computeDistanceMiles(
        THREE_SUNS_COORDS,
        feat.geometry,
        centroid
      ),
      distanceFromOriginMiles: computeDistanceMiles(
        originCoords,
        feat.geometry,
        centroid
      ),
      geocodePrecision: 'exact',
    });
  }

  // 2. CalTREES Timber Harvesting Plans (THPs)
  for (const feat of raw.thp?.features ?? []) {
    if (!feat.geometry) continue;
    const p = feat.properties ?? {};
    const hdNum = str(p.HD_NUM) || `THP-${str(p.OBJECTID)}`;
    const id = `caltrees-thp-${hdNum}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const centroid = computeGeometryCentroid(feat.geometry);
    const county = inferNearestCounty(centroid[0], centroid[1]);
    const projectName = str(p.PROJECT_NAME) || `Timber Plan ${hdNum}`;
    const owner =
      str(p.TIMBEROWNR) || str(p.LANDOWNER) || 'Private Timberland Owner';
    const landowncat = str(p.LANDOWNCAT);
    const { scope, label } = classifyThpPrivacy(landowncat);
    const totalAcres = num(p.GIS_ACRES);
    const silvi = [str(p.SILVI_1), str(p.SILVI_2), str(p.SILVI_CAT)]
      .filter(Boolean)
      .join(' · ');

    out.push({
      id,
      schNumber: hdNum,
      title: `${projectName} (THP)`,
      source: 'CalTREES THP',
      privacyScope: scope,
      accessLabel: label,
      status: str(p.PLAN_STAT) || 'Approved',
      leadAgency: owner,
      county,
      counties: [county],
      ceqaPathway: 'CalVTP Certified',
      documentType: 'CalTREES THP',
      exemptStatus: `CAL FIRE THP (${str(p.PLAN_STAT) || 'Recorded'})`,
      treatmentCategories: classifyTreatmentCategories({
        text: `${projectName} ${silvi} fuel break manual`,
      }),
      rawTreatmentTypes: [silvi || 'Timber Harvest Plan'],
      totalAcres,
      rxBroadcastAcres: 0,
      rxPileAcres: 0,
      manualAcres: 0,
      mechanicalAcres: totalAcres,
      contactName: owner,
      contactEmail: '',
      contactPhone: '',
      contactAddress: `${county} County, CA`,
      psaLink: 'https://caltreesplans.resources.ca.gov/caltrees/',
      description: `CAL FIRE CalTREES Timber Harvesting Plan ${hdNum} (${
        landowncat || 'Private'
      }). Silviculture: ${silvi || 'Selection/Thinning'}. Botanical, soil, hydrology & cultural surveys on file.`,
      dateLabel: formatEpochDate(p.APPROVED ?? p.COMPLETED),
      centroid,
      geometry: feat.geometry,
      distanceFromThreeSunsMiles: computeDistanceMiles(
        THREE_SUNS_COORDS,
        feat.geometry,
        centroid
      ),
      distanceFromOriginMiles: computeDistanceMiles(
        originCoords,
        feat.geometry,
        centroid
      ),
      geocodePrecision: 'exact',
    });
  }

  // 3. CalTREES Forest Practice Exemptions
  for (const feat of raw.exempt?.features ?? []) {
    if (!feat.geometry) continue;
    const p = feat.properties ?? {};
    const hdNum = str(p.HD_NUM) || `EX-${str(p.OBJECTID)}`;
    const id = `caltrees-ex-${hdNum}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const centroid = computeGeometryCentroid(feat.geometry);
    const county = inferNearestCounty(centroid[0], centroid[1]);
    const owner = str(p.LANDOWNER) || 'Private Landowner';
    const exType = str(p.EX_TYPE) || 'Forest Practice Exemption';
    const totalAcres = num(p.GIS_ACRES) || num(p.REPORTD_AC);

    out.push({
      id,
      schNumber: hdNum,
      title: `${exType} — ${owner}`,
      source: 'CalTREES Exemption',
      privacyScope: 'private_recorded',
      accessLabel: 'Private Recorded (CalTREES Exemption)',
      status: p.COMPLETED ? 'Completed' : 'Accepted',
      leadAgency: owner,
      county,
      counties: [county],
      ceqaPathway: 'Class 4 NOE',
      documentType: 'CalTREES Exemption',
      exemptStatus: exType,
      treatmentCategories: classifyTreatmentCategories({
        text: `${exType} fuel break manual firehazard`,
      }),
      rawTreatmentTypes: [exType],
      totalAcres,
      rxBroadcastAcres: 0,
      rxPileAcres: 0,
      manualAcres: totalAcres,
      mechanicalAcres: 0,
      contactName: owner,
      contactEmail: '',
      contactPhone: '',
      contactAddress: `${county} County, CA`,
      psaLink: 'https://caltreesplans.resources.ca.gov/caltrees/',
      description: `CAL FIRE Forest Practice Exemption (${exType}) filed by ${owner}.`,
      dateLabel: formatEpochDate(p.ACCEPTED ?? p.COMPLETED),
      centroid,
      geometry: feat.geometry,
      distanceFromThreeSunsMiles: computeDistanceMiles(
        THREE_SUNS_COORDS,
        feat.geometry,
        centroid
      ),
      distanceFromOriginMiles: computeDistanceMiles(
        originCoords,
        feat.geometry,
        centroid
      ),
      geocodePrecision: 'exact',
    });
  }

  return out;
}

export async function fetchOfflinePrivateRecordedRaw(): Promise<RawPrivateCache> {
  const res = await fetch(
    `${import.meta.env.BASE_URL}data/private-recorded-cache.json`
  );
  if (!res.ok) {
    throw new Error(`Failed to load private-recorded cache (${res.status})`);
  }
  return (await res.json()) as RawPrivateCache;
}

async function queryLayerBbox(
  endpoint: string,
  bboxStr: string,
  where = '1=1',
  limit = 200
): Promise<FeatureCollection<Geometry, Record<string, unknown>>> {
  const qs = new URLSearchParams({
    where,
    geometry: bboxStr,
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: '*',
    returnGeometry: 'true',
    geometryPrecision: '5',
    maxAllowableOffset: '0.0004',
    resultRecordCount: String(limit),
    f: 'geojson',
  }).toString();

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 14000);
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

export async function fetchLivePrivateRecordedInBbox(
  bbox: [number, number, number, number],
  originCoords: [number, number]
): Promise<SpatialProject[]> {
  const bboxStr = bbox.map((n) => n.toFixed(5)).join(',');
  const [ccedRes, thpRes, exemptRes] = await Promise.allSettled([
    queryLayerBbox(CCED_QUERY, bboxStr, '1=1', 250),
    queryLayerBbox(THP_QUERY, bboxStr, 'THP_YEAR >= 2018', 250),
    queryLayerBbox(EXEMPT_QUERY, bboxStr, 'EX_YEAR >= 2021', 200),
  ]);

  const emptyFc: FeatureCollection<Geometry, Record<string, unknown>> = {
    type: 'FeatureCollection',
    features: [],
  };

  const raw: RawPrivateCache = {
    fetchedAt: new Date().toISOString(),
    cced: ccedRes.status === 'fulfilled' ? ccedRes.value : emptyFc,
    thp: thpRes.status === 'fulfilled' ? thpRes.value : emptyFc,
    exempt: exemptRes.status === 'fulfilled' ? exemptRes.value : emptyFc,
  };

  return normalizePrivateRecordedCache(raw, originCoords);
}

export function createParcelProbeProject(
  lng: number,
  lat: number,
  originCoords: [number, number]
): SpatialProject {
  const county = inferNearestCounty(lng, lat);
  const geometry: Geometry = {
    type: 'Point',
    coordinates: [lng, lat],
  };
  const centroid: [number, number] = [lng, lat];
  const coordLabel = `${lat.toFixed(4)}°N, ${Math.abs(lng).toFixed(4)}°W`;

  return {
    id: `probe-${lat.toFixed(5)}-${lng.toFixed(5)}`,
    schNumber: `PROBE-${lat.toFixed(3)}N`,
    title: `Private Parcel / Site Probe (${coordLabel})`,
    source: 'Parcel Probe',
    privacyScope: 'completely_private',
    accessLabel: 'Unrecorded / Private Coordinate Probe',
    status: 'Custom Probe',
    leadAgency: 'Private Landowner / Unverified Parcel',
    county,
    counties: [county],
    ceqaPathway: 'Class 4 NOE',
    documentType: 'Spatial Probe',
    exemptStatus: 'On-Demand Indicator Scan',
    treatmentCategories: ['Manual Hand-Crew Prep'],
    rawTreatmentTypes: ['Site Probe'],
    totalAcres: 0,
    rxBroadcastAcres: 0,
    rxPileAcres: 0,
    manualAcres: 0,
    mechanicalAcres: 0,
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    contactAddress: `${county} County (${coordLabel})`,
    psaLink: '',
    description: `Custom map probe at ${coordLabel} in ${county} County. Inspect Recorded Studies below to verify any overlapping CCED easements, CAL FIRE CalTREES/CalVTP plans, CEQAnet records, or CDFW ACE species flags.`,
    dateLabel: new Date().toISOString().slice(0, 10),
    centroid,
    geometry,
    distanceFromThreeSunsMiles: computeDistanceMiles(
      THREE_SUNS_COORDS,
      geometry,
      centroid
    ),
    distanceFromOriginMiles: computeDistanceMiles(
      originCoords,
      geometry,
      centroid
    ),
    geocodePrecision: 'exact',
  };
}
