export interface FeatureItem {
  name: string;
  summary: string;
  details: string;
}

export interface FeatureCategory {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  items: FeatureItem[];
}

export const FEATURES_CATALOG: FeatureCategory[] = [
  {
    id: 'data-pipeline',
    code: '01',
    title: 'Spatial Data Connectors & Off-Grid Resilience',
    subtitle: 'Live public California registries paired with local offline caches for Starlink/solar setups',
    items: [
      {
        name: 'Live Statewide CalVTP GIS Connector',
        summary: 'Queries CAL FIRE CalVTP ArcGIS FeatureServers directly for approved, active, and proposed projects.',
        details: 'Loads 148 project boundary polygons, 208 proposed point locations, and county treatment mappings with 1-click live refresh.',
      },
      {
        name: 'Offline CalVTP & Private-Site Fallback Caches',
        summary: 'Boots instantaneously without internet using bundled GeoJSON snapshots and IndexedDB caching.',
        details: 'Includes 148 CalVTP boundaries, 208 proposed sites, 250 CCED Conservation Easements, 250 CalTREES THPs, and 200 Exemptions.',
      },
      {
        name: 'CEQAnet CSV & GeoJSON Drag-and-Drop Importer',
        summary: 'Merges Notice of Exemption (NOE) and Notice of Determination (NOD) exports from ceqanet.lci.ca.gov.',
        details: 'Auto-maps SCH Number, Project Title, Lead Agency, County, Document Type, Exempt Status, and Description with City/County geocoding fallback and a 1-click sample dataset.',
      },
      {
        name: 'Live Area Scanner (CCED + CalTREES)',
        summary: 'Pulls Conservation Easements and CAL FIRE Timber Harvesting Plans for any California map view.',
        details: 'Click "Scan Area" on the map to fetch up to 250 CCED Easements, 250 THPs, and 200 Forest Practice Exemptions inside your active viewport.',
      },
      {
        name: 'Portable JSON Backup & Restore',
        summary: 'Saves all CRM statuses, agency notes, contact overrides, and imported CEQAnet records locally.',
        details: 'Stored automatically in IndexedDB + localStorage, with 1-click .json export and restore for transferring databases between field machines.',
      },
    ],
  },
  {
    id: 'spatial-search',
    code: '02',
    title: 'Dual Spatial Search, Access & CEQA Filters',
    subtitle: 'Target projects by Northern/Central CA drive shed, custom radius, CEQA authority, or land privacy',
    items: [
      {
        name: 'Mode A: 58-County Multi-Select + 3 Suns Drive Shed',
        summary: 'Searchable picker for all 58 California counties plus a 1-click 34-county regional preset.',
        details: 'Instantly isolates the "3 Suns 4-Hour Drive Shed (34 Counties)" surrounding Nevada City, CA.',
      },
      {
        name: 'Mode B: Origin Address + Turf.js Radius (10–250 mi)',
        summary: 'Calculates exact mileage from any starting address to project polygons and points in real time.',
        details: 'Defaulted to 13418 McKitrick Ranch Rd, Nevada City, CA 95959 with Nominatim, US Census, and offline CA geocoding plus a live radius circle overlay.',
      },
      {
        name: 'Site Access / Privacy Visibility Toggles',
        summary: 'Include private-recorded lands, hide completely private parcels, or inspect private-only holdings.',
        details: '4-mode filter: All Sites, Hide Completely Private, Private Recorded Only (CCED/CalTREES), and Completely Private Only (Closed access & probes).',
      },
      {
        name: 'CEQA Pathway, Treatment & Acreage Filters',
        summary: 'Slice directly by environmental clearance, burn-prep method, minimum size, CRM status, or keyword.',
        details: 'Supports CalVTP Certified, SERP Statutory Exemption, Class 4 NOE, and AB 211 / PRC 4799.05 across Prescribed/Cultural Burn, Manual Hand-Crew Prep, and Shaded Fuel Break.',
      },
    ],
  },
  {
    id: 'topo-3d-map',
    code: '03',
    title: 'Interactive 3D Topographical, Satellite & Gimbal Map',
    subtitle: 'Zero-API-key MapLibre GL JS cartography with elevation contours, 3D relief, and rural building massing',
    items: [
      {
        name: '3D Terrain Elevation & Shaded Relief',
        summary: 'Drapes ridges, canyons, and watersheds over AWS Open Data Terrarium elevation tiles.',
        details: '1.25x terrain exaggeration with dynamic hillshading (0.35 exaggeration) for Sierra foothill topography.',
      },
      {
        name: 'Dynamic Foot-Scale Elevation Contours',
        summary: 'Generates zoom-adaptive USGS-style contour lines client-side via maplibre-contour.',
        details: 'Renders minor and index contours (e.g., 100/500 ft at z11, 40/200 ft at z13, 20/100 ft at z15) with elevation labels in feet.',
      },
      {
        name: '3-Way Basemap Switcher (Light Topo · Dark Topo · Satellite)',
        summary: 'Instant in-place switching without tearing down 3D terrain or parcel overlays.',
        details: 'Includes muted OpenFreeMap landcover (woodland, grass, farmland, waterways) and Esri World Imagery 3D satellite hybrid.',
      },
      {
        name: '3D Building Extrusions & 3 Suns Fly-To Benchmark',
        summary: 'Architectural massing models appear at zoom >= 13 with a 6m fallback for rural outbuildings.',
        details: 'Click "3 Suns 3D" to fly directly to 13418 McKitrick Ranch Rd tilted at 55° over local contours and buildings.',
      },
      {
        name: 'Full Multi-Axis 3D Rotation & Orbit Controls',
        summary: 'Control Yaw (0–360°), Pitch (0–85°), and Roll (-180° to +180°) simultaneously.',
        details: 'Features Left-Drag Orbit mode, an interactive 2D Gimbal Pad, independent Yaw/Pitch/Roll sliders, ±45° quick buttons, North/Level reset, and 360° Auto-Orbit.',
      },
    ],
  },
  {
    id: 'indicators-crm',
    code: '04',
    title: 'Private Data Indicators, Outreach CRM & CCC Exports',
    subtitle: 'Surface recorded environmental studies on any site or map point and convert leads into CCC grant partners',
    items: [
      {
        name: 'Recorded Studies & Private Data Indicators Scanner',
        summary: 'Automatically intersects every selected parcel or map probe against 4 public California registries.',
        details: 'Checks CCED Conservation Easements, CAL FIRE CalVTP & CalTREES THPs/Exemptions, CEQAnet SCH records, and CDFW ACE + USGS 7.5\' Rare Species Quads with offline caching and per-layer retry.',
      },
      {
        name: 'Click-Anywhere Private Parcel Probe',
        summary: 'Click any open coordinate on the map outside existing boundaries to inspect that spot.',
        details: 'Drops a probe and immediately runs the 4-layer indicator scan to reveal overlapping easements, timber plans, or species quads.',
      },
      {
        name: 'Site & Agency Dossier + Outreach CRM',
        summary: 'Slide-over inspection drawer with editable contacts, pipeline stages, and persistent notes.',
        details: 'Tracks Not Contacted, Email Sent, In Conversation, and Committed for Jan CCC App alongside acreage breakdowns and agency links.',
      },
      {
        name: '1-Click Return CA Outreach & CPRA Request Generators',
        summary: 'Pre-fills tailored partner outreach emails and California Public Records Act data-sharing inquiries.',
        details: 'Automatically embeds exact SCH #, THP/CalVTP ID, Easement Name, County, acreage, and distance from 3 Suns Farm.',
      },
      {
        name: 'CCC Grant CSV, Digital Twin GeoJSON & Responsive Mobile View',
        summary: 'Export filtered pipelines for grant applications and browse cleanly on desktop or field phones.',
        details: 'Exports clean .csv and .geojson files, and provides a mobile Split View / Ledger / Map switcher plus an illustrated 5-step Visual Quick-Start Guide.',
      },
    ],
  },
];
