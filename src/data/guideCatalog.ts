export interface GuideSection {
  step: string;
  title: string;
  image: string;
  alt: string;
  summary: string;
  bullets: string[];
}

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    step: 'STEP 01',
    title: 'Header Telemetry, Live Sync & Offline Mode',
    image: 'guide/step-8-crm-sync.svg',
    alt: 'Live CalVTP sync, offline cache indicator, and sortable ledger diagram',
    summary:
      'Start from cached statewide data in milliseconds and sync live whenever connected.',
    bullets: [
      'On launch, the app loads the built-in offline cache (CalVTP boundaries, proposed sites, CCED easements, and CalTREES plans) so it works immediately on Starlink, solar, or no-signal field setups.',
      'Click "Sync CalVTP" in the top bar anytime to query the latest live CAL FIRE FeatureServer records.',
      'The header telemetry bar shows Filtered / Total sites, Filtered Footprint (acres), Committed Jan CCC count, and current connection mode.',
    ],
  },
  {
    step: 'STEP 02',
    title: 'Pick Your Search Area (Counties or Radius)',
    image: 'guide/step-1-search.svg',
    alt: 'Mode A county drive-shed selector and Mode B address radius slider diagram',
    summary:
      'Switch between county-based regional planning and exact mileage from any starting address.',
    bullets: [
      'Mode A (County Picker): Click "3 Suns 4-Hour Drive Shed (34 Counties)" for 1-click Northern & Central California targeting, or open the searchable dropdown to pick any combination of all 58 California counties.',
      'Mode B (Address + Radius): Enter any California address (defaulted to 13418 McKitrick Ranch Rd, Nevada City, CA 95959), click "Set Origin", and drag the radius slider from 10 to 250 miles.',
      'Use the "Hide / Filters" button on the filter bar to collapse controls when you want more screen space.',
    ],
  },
  {
    step: 'STEP 03',
    title: 'Filter by Site Access (Public vs. Private), CEQA & Treatment',
    image: 'guide/step-3-access.svg',
    alt: 'Site Access filter buttons showing Public CEQA, Private Recorded, and Closed Private colors',
    summary:
      'Control whether you see public CEQA projects, private lands with recorded studies, or closed private parcels.',
    bullets: [
      'Site Access filter: Choose "All Sites", "Hide Completely Private" (keeps Public + Private Recorded), "Private Recorded Only" (shows only CCED Easements & private CalTREES plans), or "Completely Private Only" (shows only Closed-access parcels and probes).',
      'CEQA Pathway pills filter to CalVTP Certified, SERP Statutory Exemption, Class 4 NOE, or AB 211 / PRC 4799.05.',
      'Treatment pills (Prescribed/Cultural Burn, Manual Hand-Crew Prep, Shaded Fuel Break), Minimum Acreage, CRM Status, and keyword search refine the ledger in real time.',
    ],
  },
  {
    step: 'STEP 04',
    title: 'Navigate the 3D Topo, Satellite & Multi-Axis Map',
    image: 'guide/step-2-map3d.svg',
    alt: '3D terrain contours, building extrusions, Satellite toggle, and 3-axis gimbal pad diagram',
    summary:
      'Switch basemaps, fly to 3 Suns Farm in 3D, and rotate freely across Yaw, Pitch, and Roll.',
    bullets: [
      'Basemap Switcher: Toggle instantly between Light Topo (woodland, grass, farmland, waterways), Dark Topo, and Satellite (Esri World Imagery draped over 3D terrain).',
      '3D & Camera Shortcuts: Click "3D Topo 55° / 2D Top-Down" to tilt, "3 Suns 3D" to fly to 13418 McKitrick Ranch Rd with contours and 3D building massing (zoom >= 13), and "Fit" to frame all filtered results.',
      'Multi-Axis Rotation: Toggle "Orbit Drag" to left-drag Yaw + Pitch directly on the map, use ↺ / ↻ (-45° / +45°), or click the "Y° P° R°" Gimbal button for the 2D Orbit Pad, independent Yaw (0–360°), Pitch (0–85°), Roll (-180° to +180°) sliders, Auto-Orbit 360°, and Reset 0/0/0.',
      'Layers Menu: Toggle Contours (ft), 3D Terrain + Relief, 3D Buildings (z >= 13), and Recorded Indicators on or off.',
    ],
  },
  {
    step: 'STEP 05',
    title: 'Scan Any Region & Drop Click-Anywhere Parcel Probes',
    image: 'guide/step-7-indicators.svg',
    alt: 'Click-anywhere map probe and 4-layer Recorded Studies scanner diagram',
    summary:
      'Discover private-recorded easements and timber plans anywhere in California—even outside CalVTP polygons.',
    bullets: [
      'Pan/zoom anywhere in California and click "Scan Area" on the map toolbar to load live CCED Conservation Easements and CAL FIRE CalTREES THPs/Exemptions inside your current map view.',
      'Click any empty patch of land on the map outside existing polygons to drop a Private Parcel Probe pin and open its Dossier immediately.',
    ],
  },
  {
    step: 'STEP 06',
    title: 'Resize Every Section & Use Fullscreen Mode',
    image: 'guide/step-6-layout.svg',
    alt: 'Draggable vertical splitters and Full Map, Full Ledger, and Full Dossier controls diagram',
    summary:
      'Customize pane sizes while viewing all three sections together, or maximize any single section.',
    bullets: [
      'Desktop Resizing: Drag the vertical handle between Map ↔ Ledger (double-click to reset 50/50), and drag the handle between Ledger ↔ Dossier when a site is open (double-click to reset).',
      'Per-Section Fullscreen: Click "Full Map" on the map, "Full Ledger" on the table header, or "Full" in the Dossier header to expand that section to 100% of the screen. Press Esc or click "Exit Full" to return.',
      'Mobile Layout: Use the Split View | Ledger | Map bar at the top, and drag the horizontal grip handle in Split View to adjust Map vs. Ledger height.',
    ],
  },
  {
    step: 'STEP 07',
    title: 'Inspect Recorded Studies, CRM Status & Outreach Emails',
    image: 'guide/step-4-dossier.svg',
    alt: 'Site and Agency Dossier drawer with Recorded Studies badges, CRM status, and outreach buttons',
    summary:
      'Verify existing environmental filings, log outreach progress, and generate CPRA or CCC partner emails in 1 click.',
    bullets: [
      'Click any polygon, probe, or table row (columns sort ascending/descending on click) to open the Site & Agency Dossier.',
      'Recorded Studies & Private Data Indicators scans CCED Conservation Easements, CAL FIRE CalVTP/CalTREES plans, CEQAnet filings, and CDFW ACE Sensitive Species Quads—showing "Recorded", "None Found", or "Source Temporarily Unavailable — Retry".',
      'Click "Copy Outreach / Records Request" on any matched Easement or Agency card for a pre-filled California Public Records Act (CPRA) inquiry, or click "Generate Return CA Outreach Email" for a tailored Jan CCC Project Sponsor email.',
      'Edit Contact Name/Email/Phone, Outreach Status ("Not Contacted", "Email Sent", "In Conversation", "Committed for Jan CCC App"), and field notes—everything auto-saves locally.',
    ],
  },
  {
    step: 'STEP 08',
    title: 'Import CEQAnet CSVs, Back Up Locally & Export for CCC',
    image: 'guide/step-5-export.svg',
    alt: 'CEQAnet CSV drag-and-drop importer and CCC CSV and GeoJSON export buttons',
    summary:
      'Merge State Clearinghouse filings into your map and export clean grant-ready spreadsheets.',
    bullets: [
      'Click "CEQAnet / Backup" to drag-and-drop .csv exports from ceqanet.lci.ca.gov (or .geojson files). Records without lat/lon automatically geocode via California City/County centroids, or click "Load Sample CEQAnet CSV" to test immediately.',
      'Use "Export Backup (.json)" and "Restore Backup (.json)" inside the modal to back up or transfer all your outreach notes and imported CEQAnet records between computers.',
      'Click "CCC .CSV" to export your currently filtered sites for the January CCC Project Sponsor application, or ".GeoJSON" for external GIS / Digital Twin tools.',
    ],
  },
];
