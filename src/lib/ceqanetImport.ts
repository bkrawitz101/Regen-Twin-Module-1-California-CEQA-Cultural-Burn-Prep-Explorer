import Papa from 'papaparse';
import type { FeatureCollection, Geometry } from 'geojson';
import {
  THREE_SUNS_COORDS,
  inferNearestCounty,
  normalizeCountyName,
} from '../data/caCounties';
import type { SpatialProject } from '../types';
import { geocodeCityCountyOffline } from './geocode';
import {
  classifyCeqaPathway,
  classifyTreatmentCategories,
  computeDistanceMiles,
  computeGeometryCentroid,
} from './spatial';

export interface ImportResult {
  projects: SpatialProject[];
  warnings: string[];
}

function pickField(
  row: Record<string, unknown>,
  candidates: string[]
): string {
  const keys = Object.keys(row);
  for (const cand of candidates) {
    const exact = keys.find(
      (k) => k.trim().toLowerCase() === cand.toLowerCase()
    );
    if (exact && row[exact] !== undefined && row[exact] !== null) {
      const v = String(row[exact]).trim();
      if (v) return v;
    }
  }
  for (const cand of candidates) {
    const partial = keys.find((k) =>
      k.trim().toLowerCase().includes(cand.toLowerCase())
    );
    if (partial && row[partial] !== undefined && row[partial] !== null) {
      const v = String(row[partial]).trim();
      if (v) return v;
    }
  }
  return '';
}

function parseAcreage(raw: string, description: string): number {
  const n = Number(raw.replace(/,/g, ''));
  if (Number.isFinite(n) && n > 0) return Math.round(n * 10) / 10;

  const match = description.match(/(\d[\d,]*\.?\d*)\s*(?:acres?|ac\b)/i);
  if (match) {
    const parsed = Number(match[1].replace(/,/g, ''));
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed * 10) / 10;
    }
  }
  return 0;
}

export function parseCeqanetFile(
  fileName: string,
  content: string,
  originCoords: [number, number] = THREE_SUNS_COORDS
): ImportResult {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith('.geojson') || lowerName.endsWith('.json')) {
    return parseGeoJsonImport(content, originCoords);
  }
  return parseCeqanetCsv(content, originCoords);
}

export function parseCeqanetCsv(
  csvText: string,
  originCoords: [number, number] = THREE_SUNS_COORDS
): ImportResult {
  const parsed = Papa.parse<Record<string, unknown>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const warnings: string[] = [];
  if (parsed.errors.length > 0) {
    warnings.push(
      `CSV parser noted ${parsed.errors.length} formatting warning(s).`
    );
  }

  const projects: SpatialProject[] = [];

  parsed.data.forEach((row, idx) => {
    const schNumber =
      pickField(row, ['SCH Number', 'SCH #', 'SCH', 'SchNumber', 'Project ID']) ||
      `CEQANET-${Date.now()}-${idx + 1}`;
    const title = pickField(row, [
      'Project Title',
      'Title',
      'Project Name',
      'ProjectName',
    ]);
    const leadAgency =
      pickField(row, ['Lead Agency', 'LeadAgency', 'Agency', 'Organization']) ||
      'California Lead Agency';
    const rawCounty = pickField(row, ['County', 'Counties']);
    const city = pickField(row, ['City', 'Location', 'Municipality']);
    const docType =
      pickField(row, ['Document Type', 'Doc Type', 'Notice Type', 'DocumentType']) ||
      'NOE';
    const exemptStatus = pickField(row, [
      'Exempt Status',
      'Exemption Status',
      'Exemption',
      'CEQA Authority',
      'ExemptReason',
    ]);
    const description = pickField(row, [
      'Description',
      'Project Description',
      'Summary',
      'Comments',
    ]);
    const rawAcres = pickField(row, ['Acreage', 'Acres', 'TotalAcres', 'Total Acres']);
    const rawLat = pickField(row, ['Latitude', 'Lat', 'Y']);
    const rawLon = pickField(row, ['Longitude', 'Lon', 'Lng', 'Long', 'X']);
    const contactName = pickField(row, ['Contact Name', 'ContactName', 'Contact']);
    const contactEmail = pickField(row, ['Contact Email', 'ContactEmail', 'Email']);
    const contactPhone = pickField(row, ['Contact Phone', 'ContactPhone', 'Phone']);
    const dateLabel =
      pickField(row, ['Posted Date', 'Date Received', 'Filed Date', 'Date']) ||
      'CEQAnet CSV';

    if (!title && !description && !schNumber) return;

    const lat = Number(rawLat);
    const lon = Number(rawLon);
    let coords: [number, number];
    let county = normalizeCountyName(rawCounty);
    let precision: 'exact' | 'city' | 'county' = 'exact';

    if (
      Number.isFinite(lat) &&
      Number.isFinite(lon) &&
      lat >= 32 &&
      lat <= 42.5 &&
      lon <= -113 &&
      lon >= -125
    ) {
      coords = [lon, lat];
      if (!county) county = inferNearestCounty(lon, lat);
    } else {
      const fallback = geocodeCityCountyOffline(city, rawCounty);
      // Slight deterministic jitter for county/city centroids so overlapping NOEs remain clickable
      const jitterLng = (((idx % 7) - 3) * 0.012);
      const jitterLat = (((Math.floor(idx / 7) % 5) - 2) * 0.01);
      coords = [fallback.coords[0] + jitterLng, fallback.coords[1] + jitterLat];
      county = fallback.county;
      precision = fallback.precision;
    }

    const geometry: Geometry = {
      type: 'Point',
      coordinates: coords,
    };

    const totalAcres = parseAcreage(rawAcres, description);
    const ceqaPathway = classifyCeqaPathway({
      documentType: docType,
      exemptStatus,
      title,
      description,
    });
    const treatmentCategories = classifyTreatmentCategories({
      rawTypes: [docType, exemptStatus],
      text: `${title} ${description}`,
    });

    projects.push({
      id: `ceqanet-${schNumber.replace(/[^a-zA-Z0-9_-]/g, '')}-${idx}`,
      schNumber,
      title: title || `CEQAnet Record ${schNumber}`,
      source: 'CEQAnet Import',
      status: docType || 'Filed',
      leadAgency,
      county: county || 'Nevada',
      counties: [county || 'Nevada'],
      ceqaPathway,
      documentType: docType,
      exemptStatus: exemptStatus || docType,
      treatmentCategories,
      rawTreatmentTypes: [docType, exemptStatus].filter(Boolean),
      totalAcres,
      rxBroadcastAcres: treatmentCategories.includes('Prescribed/Cultural Burn')
        ? totalAcres
        : 0,
      rxPileAcres: 0,
      manualAcres: treatmentCategories.includes('Manual Hand-Crew Prep')
        ? totalAcres
        : 0,
      mechanicalAcres: 0,
      contactName,
      contactEmail,
      contactPhone,
      contactAddress: [city, county ? `${county} County, CA` : 'CA']
        .filter(Boolean)
        .join(', '),
      psaLink: `https://ceqanet.opr.ca.gov/Search?SchNumber=${encodeURIComponent(
        schNumber
      )}`,
      description: description || `${docType} — ${exemptStatus}`,
      dateLabel,
      centroid: coords,
      geometry,
      distanceFromThreeSunsMiles: computeDistanceMiles(
        THREE_SUNS_COORDS,
        geometry,
        coords
      ),
      distanceFromOriginMiles: computeDistanceMiles(originCoords, geometry, coords),
      geocodePrecision: precision,
    });
  });

  if (projects.length === 0) {
    warnings.push(
      'No valid CEQAnet records found. Ensure CSV includes SCH Number, Project Title, or County columns.'
    );
  }

  return { projects, warnings };
}

function parseGeoJsonImport(
  jsonText: string,
  originCoords: [number, number]
): ImportResult {
  const warnings: string[] = [];
  const parsed = JSON.parse(jsonText) as FeatureCollection<
    Geometry,
    Record<string, unknown>
  >;
  const features = parsed.features ?? [];
  const projects: SpatialProject[] = [];

  features.forEach((f, idx) => {
    if (!f.geometry) return;
    const p = f.properties ?? {};
    const schNumber =
      pickField(p, ['schNumber', 'SCH Number', 'ProjectID', 'Project_ID', 'id']) ||
      `GEOJSON-${idx + 1}`;
    const title =
      pickField(p, ['title', 'Project Title', 'ProjectName', 'name']) ||
      `Imported Feature ${schNumber}`;
    const leadAgency =
      pickField(p, ['leadAgency', 'Lead Agency', 'Organization', 'agency']) ||
      'Imported Agency';
    const centroid = computeGeometryCentroid(f.geometry);
    const county =
      normalizeCountyName(pickField(p, ['county', 'County'])) ||
      inferNearestCounty(centroid[0], centroid[1]);
    const docType = pickField(p, ['documentType', 'Document Type']) || 'GeoJSON Layer';
    const exemptStatus = pickField(p, ['exemptStatus', 'Exempt Status', 'status']);
    const description = pickField(p, ['description', 'Description', 'Comments']);
    const totalAcres = parseAcreage(
      pickField(p, ['totalAcres', 'TotalAcres', 'Acreage', 'acres']),
      description
    );

    const ceqaPathway = classifyCeqaPathway({
      documentType: docType,
      exemptStatus,
      title,
      description,
    });
    const treatmentCategories = classifyTreatmentCategories({
      text: `${title} ${description}`,
    });

    projects.push({
      id: `geojson-${schNumber.replace(/[^a-zA-Z0-9_-]/g, '')}-${idx}`,
      schNumber,
      title,
      source: 'CEQAnet Import',
      status: exemptStatus || 'Imported',
      leadAgency,
      county,
      counties: [county],
      ceqaPathway,
      documentType: docType,
      exemptStatus: exemptStatus || 'Imported Spatial Record',
      treatmentCategories,
      rawTreatmentTypes: [docType],
      totalAcres,
      rxBroadcastAcres: 0,
      rxPileAcres: 0,
      manualAcres: 0,
      mechanicalAcres: 0,
      contactName: pickField(p, ['contactName', 'ContactName']),
      contactEmail: pickField(p, ['contactEmail', 'ContactEmail']),
      contactPhone: pickField(p, ['contactPhone', 'ContactPhone', 'ContactNumber']),
      contactAddress: pickField(p, ['contactAddress', 'ContactAddress']),
      psaLink: pickField(p, ['psaLink', 'PSALink']),
      description: description || `${title} (${county} County)`,
      dateLabel: pickField(p, ['dateLabel', 'Date']) || 'GeoJSON',
      centroid,
      geometry: f.geometry,
      distanceFromThreeSunsMiles: computeDistanceMiles(
        THREE_SUNS_COORDS,
        f.geometry,
        centroid
      ),
      distanceFromOriginMiles: computeDistanceMiles(
        originCoords,
        f.geometry,
        centroid
      ),
      geocodePrecision: 'exact',
    });
  });

  if (projects.length === 0) {
    warnings.push('GeoJSON file contained zero mappable features.');
  }
  return { projects, warnings };
}
