import type { Feature, Geometry } from 'geojson';

export type CeqaPathway =
  | 'CalVTP Certified'
  | 'SERP Statutory Exemption'
  | 'Class 4 NOE'
  | 'AB 211 / PRC 4799.05';

export type TreatmentCategory =
  | 'Prescribed/Cultural Burn'
  | 'Manual Hand-Crew Prep'
  | 'Shaded Fuel Break';

export type OutreachStatus =
  | 'Not Contacted'
  | 'Email Sent'
  | 'In Conversation'
  | 'Committed for Jan CCC App';

export type RecordSource =
  | 'CalVTP Approved/Active'
  | 'CalVTP Proposed'
  | 'CEQAnet Import'
  | 'CCED Easement'
  | 'CalTREES THP'
  | 'CalTREES Exemption'
  | 'Parcel Probe';

export type PrivacyScope =
  | 'public'
  | 'private_recorded'
  | 'completely_private';

export type VisibilityFilter =
  | 'all'
  | 'hide_completely_private'
  | 'private_recorded_only'
  | 'completely_private_only';

export type SearchMode = 'county' | 'radius';

export type BasemapTheme = 'light' | 'dark';

export interface SpatialProject {
  id: string;
  schNumber: string; // SCH #, CalVTP ID, THP #, or Easement ID
  title: string;
  source: RecordSource;
  privacyScope: PrivacyScope;
  accessLabel: string;
  status: string;
  leadAgency: string;
  county: string;
  counties: string[];
  ceqaPathway: CeqaPathway;
  documentType: string;
  exemptStatus: string;
  treatmentCategories: TreatmentCategory[];
  rawTreatmentTypes: string[];
  totalAcres: number;
  rxBroadcastAcres: number;
  rxPileAcres: number;
  manualAcres: number;
  mechanicalAcres: number;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  psaLink: string;
  description: string;
  dateLabel: string;
  centroid: [number, number]; // [lng, lat]
  geometry: Geometry;
  distanceFromThreeSunsMiles: number;
  distanceFromOriginMiles: number;
  geocodePrecision?: 'exact' | 'city' | 'county';
}

export interface CrmRecord {
  projectId: string;
  outreachStatus: OutreachStatus;
  notes: string;
  contactNameOverride?: string;
  contactEmailOverride?: string;
  contactPhoneOverride?: string;
  updatedAt: string;
}

export interface OriginPoint {
  address: string;
  coords: [number, number]; // [lng, lat]
  source: 'default' | 'nominatim' | 'census' | 'offline';
}

export interface FilterState {
  searchMode: SearchMode;
  selectedCounties: string[];
  radiusMiles: number;
  ceqaPathway: CeqaPathway | 'All';
  treatmentFilter: TreatmentCategory | 'All';
  visibilityFilter: VisibilityFilter;
  minAcres: number;
  searchQuery: string;
  outreachFilter: OutreachStatus | 'All';
}

export interface PersistedBackup {
  version: number;
  exportedAt: string;
  crmRecords: Record<string, CrmRecord>;
  importedProjects: SpatialProject[];
}

export type ProjectFeature = Feature<
  Geometry,
  {
    id: string;
    schNumber: string;
    title: string;
    source: RecordSource;
    privacyScope: PrivacyScope;
    ceqaPathway: CeqaPathway;
    totalAcres: number;
    county: string;
    outreachStatus: OutreachStatus;
    distanceFromOriginMiles: number;
  }
>;
