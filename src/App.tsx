import { useCallback, useEffect, useMemo, useState } from 'react';
import { DossierDrawer } from './components/DossierDrawer';
import { FilterSidebar } from './components/FilterSidebar';
import { HeaderBar } from './components/HeaderBar';
import { ImportModal } from './components/ImportModal';
import { MapPanel } from './components/MapPanel';
import { ProjectTable, type SortField } from './components/ProjectTable';
import {
  THREE_SUNS_ADDRESS,
  THREE_SUNS_COORDS,
  THREE_SUNS_DRIVESHED_34,
} from './data/caCounties';
import {
  fetchLiveCalvtpRaw,
  fetchOfflineFallbackRaw,
  normalizeCalvtpFeatures,
} from './lib/calvtp';
import { exportProjectsCsv, exportProjectsGeoJson } from './lib/exports';
import { geocodeAddress } from './lib/geocode';
import { computeDistanceMiles } from './lib/spatial';
import {
  loadCachedCalvtpRaw,
  loadCrmRecords,
  loadImportedProjects,
  saveCachedCalvtpRaw,
  saveCrmRecords,
  saveImportedProjects,
} from './lib/storage';
import type {
  CrmRecord,
  FilterState,
  OriginPoint,
  SpatialProject,
} from './types';

export function App() {
  const [calvtpProjects, setCalvtpProjects] = useState<SpatialProject[]>([]);
  const [importedProjects, setImportedProjects] = useState<SpatialProject[]>([]);
  const [crmRecords, setCrmRecords] = useState<Record<string, CrmRecord>>({});

  const [syncMode, setSyncMode] = useState<
    'live' | 'cached-idb' | 'offline-fallback' | 'loading'
  >('loading');
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const [origin, setOrigin] = useState<OriginPoint>({
    address: THREE_SUNS_ADDRESS,
    coords: THREE_SUNS_COORDS,
    source: 'default',
  });
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    searchMode: 'county',
    selectedCounties: [...THREE_SUNS_DRIVESHED_34],
    radiusMiles: 100,
    ceqaPathway: 'All',
    treatmentFilter: 'All',
    minAcres: 0,
    searchQuery: '',
    outreachFilter: 'All',
  });

  const [sortField, setSortField] = useState<SortField>('distance');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [focusTrigger, setFocusTrigger] = useState<number>(0);
  const [importModalOpen, setImportModalOpen] = useState<boolean>(false);
  const [mobilePane, setMobilePane] = useState<'split' | 'map' | 'ledger'>(
    'split'
  );

  const handleSyncLive = useCallback(async () => {
    setIsSyncing(true);
    try {
      const raw = await fetchLiveCalvtpRaw();
      await saveCachedCalvtpRaw(raw);
      const normalized = normalizeCalvtpFeatures(raw, origin.coords);
      setCalvtpProjects(normalized.projects);
      setSyncMode('live');
      setLastSyncedAt(raw.fetchedAt);
    } catch {
      // Keep existing loaded projects if live query fails off-grid
      setSyncMode((prev) => (prev === 'loading' ? 'offline-fallback' : prev));
    } finally {
      setIsSyncing(false);
    }
  }, [origin.coords]);

  // Initial local-first boot: CRM + imported CEQAnet + cached CalVTP -> live CalVTP refresh
  useEffect(() => {
    let active = true;

    (async () => {
      const [crm, imported, idbRaw] = await Promise.all([
        loadCrmRecords(),
        loadImportedProjects(),
        loadCachedCalvtpRaw<Parameters<typeof normalizeCalvtpFeatures>[0]>(),
      ]);
      if (!active) return;

      setCrmRecords(crm);
      setImportedProjects(imported);

      if (idbRaw) {
        const norm = normalizeCalvtpFeatures(idbRaw, THREE_SUNS_COORDS);
        setCalvtpProjects(norm.projects);
        setSyncMode('cached-idb');
        setLastSyncedAt(idbRaw.fetchedAt);
      } else {
        try {
          const fallbackRaw = await fetchOfflineFallbackRaw();
          if (!active) return;
          const norm = normalizeCalvtpFeatures(fallbackRaw, THREE_SUNS_COORDS);
          setCalvtpProjects(norm.projects);
          setSyncMode('offline-fallback');
          setLastSyncedAt(fallbackRaw.fetchedAt);
        } catch {
          // ignore
        }
      }

      // Attempt live CAL FIRE CalVTP sync in background
      try {
        const liveRaw = await fetchLiveCalvtpRaw();
        if (!active) return;
        await saveCachedCalvtpRaw(liveRaw);
        const norm = normalizeCalvtpFeatures(liveRaw, THREE_SUNS_COORDS);
        setCalvtpProjects(norm.projects);
        setSyncMode('live');
        setLastSyncedAt(liveRaw.fetchedAt);
      } catch {
        // Offline / Starlink unreachable: offline cache remains active
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  // Recompute distanceFromOriginMiles whenever origin coordinates change
  const unifiedProjects = useMemo(() => {
    const mergedMap = new Map<string, SpatialProject>();

    for (const p of calvtpProjects) {
      mergedMap.set(p.schNumber || p.id, p);
    }
    for (const imp of importedProjects) {
      mergedMap.set(imp.id, imp);
    }

    const isDefaultOrigin =
      origin.coords[0] === THREE_SUNS_COORDS[0] &&
      origin.coords[1] === THREE_SUNS_COORDS[1];

    return Array.from(mergedMap.values()).map((p) => ({
      ...p,
      distanceFromOriginMiles: isDefaultOrigin
        ? p.distanceFromThreeSunsMiles
        : computeDistanceMiles(origin.coords, p.geometry, p.centroid),
    }));
  }, [calvtpProjects, importedProjects, origin.coords]);

  // Real-time spatial + CEQA + CRM filtering and sorting
  const filteredProjects = useMemo(() => {
    const q = filters.searchQuery.trim().toLowerCase();

    const matched = unifiedProjects.filter((p) => {
      if (filters.searchMode === 'county') {
        if (filters.selectedCounties.length > 0) {
          const inCounty = p.counties.some((c) =>
            filters.selectedCounties.includes(c)
          );
          if (!inCounty) return false;
        }
      } else {
        if (p.distanceFromOriginMiles > filters.radiusMiles) return false;
      }

      if (
        filters.ceqaPathway !== 'All' &&
        p.ceqaPathway !== filters.ceqaPathway
      ) {
        return false;
      }

      if (
        filters.treatmentFilter !== 'All' &&
        !p.treatmentCategories.includes(filters.treatmentFilter)
      ) {
        return false;
      }

      if (filters.minAcres > 0 && p.totalAcres < filters.minAcres) {
        return false;
      }

      const status = crmRecords[p.id]?.outreachStatus ?? 'Not Contacted';
      if (
        filters.outreachFilter !== 'All' &&
        status !== filters.outreachFilter
      ) {
        return false;
      }

      if (q) {
        const hay = `${p.schNumber} ${p.title} ${p.leadAgency} ${p.county} ${p.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });

    matched.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'distance':
          cmp = a.distanceFromOriginMiles - b.distanceFromOriginMiles;
          break;
        case 'acres':
          cmp = a.totalAcres - b.totalAcres;
          break;
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'county':
          cmp = a.county.localeCompare(b.county);
          break;
        case 'pathway':
          cmp = a.ceqaPathway.localeCompare(b.ceqaPathway);
          break;
        case 'status': {
          const sa = crmRecords[a.id]?.outreachStatus ?? 'Not Contacted';
          const sb = crmRecords[b.id]?.outreachStatus ?? 'Not Contacted';
          cmp = sa.localeCompare(sb);
          break;
        }
      }
      return sortAsc ? cmp : -cmp;
    });

    return matched;
  }, [unifiedProjects, filters, crmRecords, sortField, sortAsc]);

  const filteredAcres = useMemo(
    () => filteredProjects.reduce((acc, p) => acc + (p.totalAcres || 0), 0),
    [filteredProjects]
  );

  const committedCount = useMemo(
    () =>
      Object.values(crmRecords).filter(
        (r) => r.outreachStatus === 'Committed for Jan CCC App'
      ).length,
    [crmRecords]
  );

  const selectedProject = useMemo(
    () => unifiedProjects.find((p) => p.id === selectedProjectId) ?? null,
    [unifiedProjects, selectedProjectId]
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(field === 'acres' ? false : true);
    }
  };

  const handleUpdateCrm = (projectId: string, patch: Partial<CrmRecord>) => {
    setCrmRecords((prev) => {
      const existing: CrmRecord = prev[projectId] ?? {
        projectId,
        outreachStatus: 'Not Contacted',
        notes: '',
        updatedAt: new Date().toISOString(),
      };
      const next = {
        ...prev,
        [projectId]: {
          ...existing,
          ...patch,
          updatedAt: new Date().toISOString(),
        },
      };
      void saveCrmRecords(next);
      return next;
    });
  };

  const handleGeocodeAddress = async (addr: string) => {
    setIsGeocoding(true);
    setGeocodeError(null);
    try {
      const res = await geocodeAddress(addr);
      setOrigin(res);
    } catch (err) {
      setGeocodeError(
        err instanceof Error ? err.message : 'Geocoding failed'
      );
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleResetOrigin = () => {
    setGeocodeError(null);
    setOrigin({
      address: THREE_SUNS_ADDRESS,
      coords: THREE_SUNS_COORDS,
      source: 'default',
    });
  };

  const handleMergeImported = (incoming: SpatialProject[]) => {
    setImportedProjects((prev) => {
      const bySch = new Map(prev.map((p) => [p.schNumber, p]));
      for (const item of incoming) {
        bySch.set(item.schNumber, item);
      }
      const next = Array.from(bySch.values());
      void saveImportedProjects(next);
      return next;
    });
  };

  const handleClearImported = () => {
    setImportedProjects([]);
    void saveImportedProjects([]);
  };

  const handleRestoreBackup = (
    crm: Record<string, CrmRecord>,
    imported: SpatialProject[]
  ) => {
    setCrmRecords(crm);
    setImportedProjects(imported);
    void saveCrmRecords(crm);
    void saveImportedProjects(imported);
  };

  return (
    <div className="min-h-screen lg:h-screen w-full flex flex-col bg-white text-black lg:overflow-hidden">
      <HeaderBar
        totalCount={unifiedProjects.length}
        filteredCount={filteredProjects.length}
        filteredAcres={filteredAcres}
        committedCount={committedCount}
        syncMode={syncMode}
        lastSyncedAt={lastSyncedAt}
        isSyncing={isSyncing}
        onSyncLive={() => void handleSyncLive()}
        onOpenImport={() => setImportModalOpen(true)}
        onExportCsv={() => exportProjectsCsv(filteredProjects, crmRecords)}
        onExportGeoJson={() =>
          exportProjectsGeoJson(filteredProjects, crmRecords)
        }
      />

      <FilterSidebar
        filters={filters}
        onChange={setFilters}
        origin={origin}
        isGeocoding={isGeocoding}
        geocodeError={geocodeError}
        onGeocodeAddress={(addr) => void handleGeocodeAddress(addr)}
        onResetOrigin={handleResetOrigin}
      />

      {/* Mobile Pane Switcher */}
      <div className="flex lg:hidden border-b border-black bg-neutral-100 divide-x divide-black text-[11px] font-semibold uppercase tracking-wider shrink-0">
        <button
          type="button"
          onClick={() => {
            setMobilePane('split');
            window.setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
          }}
          className={`flex-1 py-2 text-center cursor-pointer ${
            mobilePane === 'split' ? 'bg-black text-white' : 'bg-white text-black'
          }`}
        >
          Split View
        </button>
        <button
          type="button"
          onClick={() => {
            setMobilePane('ledger');
          }}
          className={`flex-1 py-2 text-center cursor-pointer ${
            mobilePane === 'ledger' ? 'bg-black text-white' : 'bg-white text-black'
          }`}
        >
          Ledger ({filteredProjects.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setMobilePane('map');
            window.setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
          }}
          className={`flex-1 py-2 text-center cursor-pointer ${
            mobilePane === 'map' ? 'bg-black text-white' : 'bg-white text-black'
          }`}
        >
          Map
        </button>
      </div>

      {/* Split View: Map Left/Top, Sortable Data Table Right/Bottom */}
      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12">
        <div
          className={`lg:col-span-6 lg:h-full min-h-0 ${
            mobilePane === 'ledger'
              ? 'hidden lg:block'
              : mobilePane === 'map'
                ? 'h-[72vh] lg:h-full'
                : 'h-[38vh] lg:h-full'
          }`}
        >
          <MapPanel
            projects={filteredProjects}
            crmRecords={crmRecords}
            selectedProjectId={selectedProjectId}
            onSelectProject={(p) => setSelectedProjectId(p.id)}
            origin={origin}
            searchMode={filters.searchMode}
            radiusMiles={filters.radiusMiles}
            focusTrigger={focusTrigger}
          />
        </div>

        <div
          className={`lg:col-span-6 lg:h-full min-h-0 ${
            mobilePane === 'map'
              ? 'hidden lg:block'
              : mobilePane === 'ledger'
                ? 'h-[72vh] lg:h-full'
                : 'h-[52vh] lg:h-full'
          }`}
        >
          <ProjectTable
            projects={filteredProjects}
            crmRecords={crmRecords}
            selectedProjectId={selectedProjectId}
            sortField={sortField}
            sortAsc={sortAsc}
            onSort={handleSort}
            onSelectProject={(p) => setSelectedProjectId(p.id)}
          />
        </div>
      </main>

      <DossierDrawer
        project={selectedProject}
        crmRecord={
          selectedProject ? crmRecords[selectedProject.id] : undefined
        }
        onClose={() => setSelectedProjectId(null)}
        onUpdateCrm={handleUpdateCrm}
        onZoomToSite={() => setFocusTrigger((n) => n + 1)}
      />

      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        originCoords={origin.coords}
        importedProjects={importedProjects}
        crmRecords={crmRecords}
        onMergeImported={handleMergeImported}
        onClearImported={handleClearImported}
        onRestoreBackup={handleRestoreBackup}
      />
    </div>
  );
}

export default App;
