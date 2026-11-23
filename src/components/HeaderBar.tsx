import {
  Database,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Upload,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface HeaderBarProps {
  totalCount: number;
  filteredCount: number;
  filteredAcres: number;
  committedCount: number;
  syncMode: 'live' | 'cached-idb' | 'offline-fallback' | 'loading';
  lastSyncedAt: string;
  isSyncing: boolean;
  onSyncLive: () => void;
  onOpenImport: () => void;
  onExportCsv: () => void;
  onExportGeoJson: () => void;
}

export function HeaderBar({
  totalCount,
  filteredCount,
  filteredAcres,
  committedCount,
  syncMode,
  lastSyncedAt,
  isSyncing,
  onSyncLive,
  onOpenImport,
  onExportCsv,
  onExportGeoJson,
}: HeaderBarProps) {
  const isOffline = syncMode === 'offline-fallback' || syncMode === 'cached-idb';

  return (
    <header className="border-b border-black bg-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="bg-black text-white px-2 py-1 text-[11px] font-semibold tracking-[0.14em] uppercase shrink-0">
          REGEN TWIN // M1
        </div>
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-semibold tracking-tight text-black truncate">
            California CEQA &amp; Cultural Burn-Prep Explorer
          </h1>
          <p className="text-[11px] uppercase tracking-[0.08em] text-neutral-500 truncate">
            Spatial Intelligence Layer — Return California × 3 Suns Farm
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="hidden xl:flex items-center border border-black divide-x divide-black text-xs">
          <div className="px-3 py-1">
            <span className="text-[10px] uppercase tracking-wider text-neutral-500 block">
              Filtered / Total
            </span>
            <span className="font-mono-tabular font-semibold">
              {filteredCount.toLocaleString()} / {totalCount.toLocaleString()}
            </span>
          </div>
          <div className="px-3 py-1">
            <span className="text-[10px] uppercase tracking-wider text-neutral-500 block">
              Filtered Footprint
            </span>
            <span className="font-mono-tabular font-semibold">
              {Math.round(filteredAcres).toLocaleString()} ac
            </span>
          </div>
          <div className="px-3 py-1">
            <span className="text-[10px] uppercase tracking-wider text-neutral-500 block">
              Committed Jan CCC
            </span>
            <span className="font-mono-tabular font-semibold">
              {committedCount.toLocaleString()}
            </span>
          </div>
          <div className="px-3 py-1 flex items-center gap-1.5">
            {isOffline ? (
              <WifiOff className="w-3.5 h-3.5 text-neutral-700" />
            ) : (
              <Wifi className="w-3.5 h-3.5 text-black" />
            )}
            <div>
              <span className="text-[10px] uppercase tracking-wider text-neutral-500 block">
                {syncMode === 'live'
                  ? 'CalVTP Live GIS'
                  : syncMode === 'loading'
                    ? 'Connecting...'
                    : 'Offline Cache'}
              </span>
              <span className="font-mono-tabular text-[10px] text-neutral-700">
                {lastSyncedAt ? lastSyncedAt.slice(0, 10) : 'Local'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onSyncLive}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 border border-black bg-white hover:bg-neutral-100 disabled:opacity-50 px-2.5 py-1.5 text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
            title="Query live CAL FIRE CalVTP ArcGIS FeatureServer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}
            />
            <span>{isSyncing ? 'Syncing' : 'Sync CalVTP'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenImport}
            className="inline-flex items-center gap-1.5 border border-black bg-black text-white hover:bg-neutral-800 px-2.5 py-1.5 text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>CEQAnet / Backup</span>
          </button>

          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 border border-black bg-white hover:bg-neutral-100 px-2.5 py-1.5 text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
            title="Export filtered sites as CSV for January CCC Project Sponsor application"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>CCC .CSV</span>
          </button>

          <button
            type="button"
            onClick={onExportGeoJson}
            className="inline-flex items-center gap-1.5 border border-black bg-white hover:bg-neutral-100 px-2.5 py-1.5 text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
            title="Export filtered spatial layer as GeoJSON for Digital Twin"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.GeoJSON</span>
          </button>
        </div>
      </div>

      {/* Compact mobile metrics */}
      <div className="flex xl:hidden w-full items-center justify-between border-t border-neutral-200 pt-1.5 text-[11px] font-mono-tabular text-neutral-700">
        <span>
          <Database className="w-3 h-3 inline mr-1" />
          {filteredCount}/{totalCount} sites ({Math.round(filteredAcres).toLocaleString()} ac)
        </span>
        <span>Committed: {committedCount}</span>
      </div>
    </header>
  );
}
