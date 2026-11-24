import {
  CA_CITY_COORDS,
  COUNTY_LOOKUP,
  THREE_SUNS_ADDRESS,
  THREE_SUNS_COORDS,
  normalizeCountyName,
} from '../data/caCounties';
import type { OriginPoint } from '../types';

export async function geocodeAddress(address: string): Promise<OriginPoint> {
  const trimmed = address.trim();
  if (!trimmed) {
    return {
      address: THREE_SUNS_ADDRESS,
      coords: THREE_SUNS_COORDS,
      source: 'default',
    };
  }

  if (
    trimmed.toLowerCase().includes('13418 mckitrick') ||
    trimmed.toLowerCase() === THREE_SUNS_ADDRESS.toLowerCase()
  ) {
    return {
      address: THREE_SUNS_ADDRESS,
      coords: THREE_SUNS_COORDS,
      source: 'default',
    };
  }

  // 1. Try Nominatim (via local Vite proxy in dev, then direct)
  const nomQuery = encodeURIComponent(
    trimmed.toLowerCase().includes('ca') ? trimmed : `${trimmed}, California`
  );
  const nomUrls = import.meta.env.DEV
    ? [
        `/api/nominatim/search?format=json&limit=1&countrycodes=us&q=${nomQuery}`,
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${nomQuery}`,
      ]
    : [
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${nomQuery}`,
      ];
  for (const url of nomUrls) {
    try {
      const controller = new AbortController();
      const t = window.setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, { signal: controller.signal });
      window.clearTimeout(t);
      if (res.ok) {
        const arr = (await res.json()) as Array<{
          lon: string;
          lat: string;
          display_name?: string;
        }>;
        if (arr.length > 0) {
          const lon = parseFloat(arr[0].lon);
          const lat = parseFloat(arr[0].lat);
          if (Number.isFinite(lon) && Number.isFinite(lat)) {
            return {
              address: trimmed,
              coords: [lon, lat],
              source: 'nominatim',
            };
          }
        }
      }
    } catch {
      // try next geocoder
    }
  }

  // 2. Try US Census Geocoder
  try {
    const censusUrl = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(
      trimmed
    )}&benchmark=Public_AR_Current&format=json`;
    const controller = new AbortController();
    const t = window.setTimeout(() => controller.abort(), 5000);
    const res = await fetch(censusUrl, { signal: controller.signal });
    window.clearTimeout(t);
    if (res.ok) {
      const data = (await res.json()) as {
        result?: {
          addressMatches?: Array<{ coordinates?: { x: number; y: number } }>;
        };
      };
      const match = data.result?.addressMatches?.[0]?.coordinates;
      if (match && Number.isFinite(match.x) && Number.isFinite(match.y)) {
        return {
          address: trimmed,
          coords: [match.x, match.y],
          source: 'census',
        };
      }
    }
  } catch {
    // fallback to offline city/county match
  }

  // 3. Offline CA city/county heuristic fallback
  const lower = trimmed.toLowerCase();
  for (const [city, info] of Object.entries(CA_CITY_COORDS)) {
    if (lower.includes(city)) {
      return {
        address: trimmed,
        coords: info.coords,
        source: 'offline',
      };
    }
  }
  for (const [key, meta] of COUNTY_LOOKUP.entries()) {
    if (lower.includes(key)) {
      return {
        address: trimmed,
        coords: meta.centroid,
        source: 'offline',
      };
    }
  }

  throw new Error(
    'Unable to geocode address online or match a California city/county offline.'
  );
}

export function geocodeCityCountyOffline(
  cityRaw: string,
  countyRaw: string
): {
  coords: [number, number];
  county: string;
  precision: 'city' | 'county';
} {
  const cityKey = cityRaw.trim().toLowerCase();
  const normalizedCounty = normalizeCountyName(countyRaw);

  if (cityKey && CA_CITY_COORDS[cityKey]) {
    const hit = CA_CITY_COORDS[cityKey];
    return {
      coords: hit.coords,
      county: normalizedCounty || hit.county,
      precision: 'city',
    };
  }

  if (normalizedCounty && COUNTY_LOOKUP.has(normalizedCounty.toLowerCase())) {
    const c = COUNTY_LOOKUP.get(normalizedCounty.toLowerCase())!;
    return {
      coords: c.centroid,
      county: c.name,
      precision: 'county',
    };
  }

  return {
    coords: THREE_SUNS_COORDS,
    county: normalizedCounty || 'Nevada',
    precision: 'county',
  };
}
