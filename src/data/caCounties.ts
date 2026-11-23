export interface CountyMeta {
  name: string;
  centroid: [number, number]; // [lng, lat]
}

export const THREE_SUNS_ADDRESS = '13418 McKitrick Ranch Rd, Nevada City, CA 95959';
export const THREE_SUNS_COORDS: [number, number] = [-121.0235, 39.2778];

export const THREE_SUNS_DRIVESHED_34: string[] = [
  'Alameda',
  'Alpine',
  'Amador',
  'Butte',
  'Calaveras',
  'Colusa',
  'Contra Costa',
  'El Dorado',
  'Glenn',
  'Lake',
  'Lassen',
  'Marin',
  'Mariposa',
  'Mendocino',
  'Merced',
  'Napa',
  'Nevada',
  'Placer',
  'Plumas',
  'Sacramento',
  'San Francisco',
  'San Joaquin',
  'San Mateo',
  'Santa Clara',
  'Shasta',
  'Sierra',
  'Solano',
  'Sonoma',
  'Stanislaus',
  'Sutter',
  'Tehama',
  'Tuolumne',
  'Yolo',
  'Yuba',
];

export const CA_COUNTIES: CountyMeta[] = [
  { name: 'Alameda', centroid: [-121.9179, 37.6481] },
  { name: 'Alpine', centroid: [-119.8206, 38.5973] },
  { name: 'Amador', centroid: [-120.6511, 38.4464] },
  { name: 'Butte', centroid: [-121.6007, 39.6673] },
  { name: 'Calaveras', centroid: [-120.5542, 38.2046] },
  { name: 'Colusa', centroid: [-122.2371, 39.1777] },
  { name: 'Contra Costa', centroid: [-121.9515, 37.9234] },
  { name: 'Del Norte', centroid: [-123.8975, 41.7431] },
  { name: 'El Dorado', centroid: [-120.5247, 38.7787] },
  { name: 'Fresno', centroid: [-119.6493, 36.7582] },
  { name: 'Glenn', centroid: [-122.3922, 39.5984] },
  { name: 'Humboldt', centroid: [-123.9158, 40.7050] },
  { name: 'Imperial', centroid: [-115.3653, 33.0395] },
  { name: 'Inyo', centroid: [-117.4106, 36.5111] },
  { name: 'Kern', centroid: [-118.7295, 35.3429] },
  { name: 'Kings', centroid: [-119.8155, 36.0753] },
  { name: 'Lake', centroid: [-122.7532, 39.0996] },
  { name: 'Lassen', centroid: [-120.5943, 40.6736] },
  { name: 'Los Angeles', centroid: [-118.2248, 34.3209] },
  { name: 'Madera', centroid: [-119.7627, 37.2180] },
  { name: 'Marin', centroid: [-122.7489, 38.0552] },
  { name: 'Mariposa', centroid: [-119.9055, 37.5815] },
  { name: 'Mendocino', centroid: [-123.4316, 39.4404] },
  { name: 'Merced', centroid: [-120.7177, 37.1919] },
  { name: 'Modoc', centroid: [-120.7250, 41.5898] },
  { name: 'Mono', centroid: [-118.8867, 37.9390] },
  { name: 'Monterey', centroid: [-121.3091, 36.2186] },
  { name: 'Napa', centroid: [-122.3303, 38.5063] },
  { name: 'Nevada', centroid: [-120.7686, 39.3014] },
  { name: 'Orange', centroid: [-117.7761, 33.6769] },
  { name: 'Placer', centroid: [-120.7177, 39.0635] },
  { name: 'Plumas', centroid: [-120.8386, 40.0047] },
  { name: 'Riverside', centroid: [-115.9938, 33.7437] },
  { name: 'Sacramento', centroid: [-121.3442, 38.4493] },
  { name: 'San Benito', centroid: [-121.0750, 36.6057] },
  { name: 'San Bernardino', centroid: [-116.1785, 34.8414] },
  { name: 'San Diego', centroid: [-116.7353, 33.0282] },
  { name: 'San Francisco', centroid: [-122.4430, 37.7562] },
  { name: 'San Joaquin', centroid: [-121.2714, 37.9347] },
  { name: 'San Luis Obispo', centroid: [-120.4522, 35.3874] },
  { name: 'San Mateo', centroid: [-122.3557, 37.4362] },
  { name: 'Santa Barbara', centroid: [-120.0308, 34.6729] },
  { name: 'Santa Clara', centroid: [-121.6951, 37.2325] },
  { name: 'Santa Cruz', centroid: [-122.0025, 37.0216] },
  { name: 'Shasta', centroid: [-122.0405, 40.7638] },
  { name: 'Sierra', centroid: [-120.5160, 39.5804] },
  { name: 'Siskiyou', centroid: [-122.5404, 41.5927] },
  { name: 'Solano', centroid: [-121.9396, 38.2669] },
  { name: 'Sonoma', centroid: [-122.9261, 38.5283] },
  { name: 'Stanislaus', centroid: [-120.9977, 37.5591] },
  { name: 'Sutter', centroid: [-121.6948, 39.0342] },
  { name: 'Tehama', centroid: [-122.2342, 40.1257] },
  { name: 'Trinity', centroid: [-123.1126, 40.6507] },
  { name: 'Tulare', centroid: [-118.8005, 36.2202] },
  { name: 'Tuolumne', centroid: [-119.9547, 38.0276] },
  { name: 'Ventura', centroid: [-119.0835, 34.4565] },
  { name: 'Yolo', centroid: [-121.9016, 38.6866] },
  { name: 'Yuba', centroid: [-121.3513, 39.2690] },
];

export const COUNTY_LOOKUP = new Map(
  CA_COUNTIES.map((c) => [c.name.toLowerCase(), c])
);

export const CA_CITY_COORDS: Record<string, { coords: [number, number]; county: string }> = {
  'nevada city': { coords: [-121.0161, 39.2616], county: 'Nevada' },
  'grass valley': { coords: [-121.0611, 39.2191], county: 'Nevada' },
  'truckee': { coords: [-120.1833, 39.3280], county: 'Nevada' },
  'north san juan': { coords: [-121.1011, 39.3693], county: 'Nevada' },
  'penn valley': { coords: [-121.1902, 39.1966], county: 'Nevada' },
  'auburn': { coords: [-121.0769, 38.8966], county: 'Placer' },
  'colfax': { coords: [-120.9533, 39.1007], county: 'Placer' },
  'foresthill': { coords: [-120.8180, 39.0202], county: 'Placer' },
  'tahoe city': { coords: [-120.1438, 39.1724], county: 'Placer' },
  'roseville': { coords: [-121.2880, 38.7521], county: 'Placer' },
  'downieville': { coords: [-120.8277, 39.5596], county: 'Sierra' },
  'loyalton': { coords: [-120.2410, 39.6763], county: 'Sierra' },
  'camptonville': { coords: [-121.0486, 39.4521], county: 'Yuba' },
  'marysville': { coords: [-121.5914, 39.1457], county: 'Yuba' },
  'brownsville': { coords: [-121.2669, 39.4621], county: 'Yuba' },
  'placerville': { coords: [-120.7986, 38.7296], county: 'El Dorado' },
  'south lake tahoe': { coords: [-119.9772, 38.9399], county: 'El Dorado' },
  'georgetown': { coords: [-120.8386, 38.9068], county: 'El Dorado' },
  'quincy': { coords: [-120.9472, 39.9368], county: 'Plumas' },
  'portola': { coords: [-120.4691, 39.8105], county: 'Plumas' },
  'chester': { coords: [-121.2319, 40.3063], county: 'Plumas' },
  'oroville': { coords: [-121.5564, 39.5138], county: 'Butte' },
  'chico': { coords: [-121.8375, 39.7285], county: 'Butte' },
  'paradise': { coords: [-121.6219, 39.7596], county: 'Butte' },
  'sacramento': { coords: [-121.4944, 38.5816], county: 'Sacramento' },
  'davis': { coords: [-121.7405, 38.5449], county: 'Yolo' },
  'woodland': { coords: [-121.7733, 38.6785], county: 'Yolo' },
  'redding': { coords: [-122.3917, 40.5865], county: 'Shasta' },
  'red bluff': { coords: [-122.2358, 40.1785], county: 'Tehama' },
  'susanville': { coords: [-120.6530, 40.4163], county: 'Lassen' },
  'jackson': { coords: [-120.7741, 38.3488], county: 'Amador' },
  'san andreas': { coords: [-120.6805, 38.1960], county: 'Calaveras' },
  'angels camp': { coords: [-120.5385, 38.0677], county: 'Calaveras' },
  'sonora': { coords: [-120.3821, 37.9829], county: 'Tuolumne' },
  'mariposa': { coords: [-119.9663, 37.4849], county: 'Mariposa' },
  'santa rosa': { coords: [-122.7141, 38.4404], county: 'Sonoma' },
  'healdsburg': { coords: [-122.8692, 38.6105], county: 'Sonoma' },
  'napa': { coords: [-122.2869, 38.2975], county: 'Napa' },
  'ukiah': { coords: [-123.2078, 39.1502], county: 'Mendocino' },
  'willits': { coords: [-123.3556, 39.4096], county: 'Mendocino' },
  'lakeport': { coords: [-122.9158, 39.0430], county: 'Lake' },
  'clearlake': { coords: [-122.6264, 38.9582], county: 'Lake' },
  'eureka': { coords: [-124.1637, 40.8021], county: 'Humboldt' },
  'arcata': { coords: [-124.0828, 40.8665], county: 'Humboldt' },
  'weaverville': { coords: [-122.9420, 40.7310], county: 'Trinity' },
  'yreka': { coords: [-122.6345, 41.7354], county: 'Siskiyou' },
  'mount shasta': { coords: [-122.3106, 41.3099], county: 'Siskiyou' },
  'alturas': { coords: [-120.5425, 41.4871], county: 'Modoc' },
  'fresno': { coords: [-119.7871, 36.7378], county: 'Fresno' },
  'bakersfield': { coords: [-119.0187, 35.3733], county: 'Kern' },
  'santa barbara': { coords: [-119.6982, 34.4208], county: 'Santa Barbara' },
  'san luis obispo': { coords: [-120.6596, 35.2828], county: 'San Luis Obispo' },
  'monterey': { coords: [-121.8947, 36.6002], county: 'Monterey' },
  'santa cruz': { coords: [-122.0308, 36.9741], county: 'Santa Cruz' },
  'san jose': { coords: [-121.8863, 37.3382], county: 'Santa Clara' },
  'oakland': { coords: [-122.2712, 37.8044], county: 'Alameda' },
  'san francisco': { coords: [-122.4194, 37.7749], county: 'San Francisco' },
  'san rafael': { coords: [-122.5311, 37.9735], county: 'Marin' },
  'los angeles': { coords: [-118.2437, 34.0522], county: 'Los Angeles' },
  'san diego': { coords: [-117.1611, 32.7157], county: 'San Diego' },
  'riverside': { coords: [-117.3755, 33.9806], county: 'Riverside' },
  'san bernardino': { coords: [-117.2898, 34.1083], county: 'San Bernardino' },
  'bishop': { coords: [-118.3997, 37.3614], county: 'Inyo' },
  'mammoth lakes': { coords: [-118.9721, 37.6485], county: 'Mono' },
  'markleeville': { coords: [-119.7802, 38.6949], county: 'Alpine' },
};

export function normalizeCountyName(raw: string | undefined | null): string {
  if (!raw) return '';
  const cleaned = raw
    .replace(/\bCounty\b/gi, '')
    .replace(/[;,]+/g, ' ')
    .trim();
  const match = COUNTY_LOOKUP.get(cleaned.toLowerCase());
  return match ? match.name : cleaned;
}

export function inferNearestCounty(lng: number, lat: number): string {
  let best = 'Nevada';
  let minD2 = Infinity;
  for (const c of CA_COUNTIES) {
    const dx = lng - c.centroid[0];
    const dy = lat - c.centroid[1];
    const d2 = dx * dx + dy * dy;
    if (d2 < minD2) {
      minD2 = d2;
      best = c.name;
    }
  }
  return best;
}
