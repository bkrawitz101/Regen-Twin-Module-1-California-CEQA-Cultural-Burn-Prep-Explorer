import {
  ArrowDown,
  ArrowUp,
  Expand,
  ExternalLink,
  Minimize2,
} from 'lucide-react';
import type { CrmRecord, OutreachStatus, SpatialProject } from '../types';

export type SortField =
  | 'distance'
  | 'acres'
  | 'title'
  | 'county'
  | 'pathway'
  | 'status';

interface ProjectTableProps {
  projects: SpatialProject[];
  crmRecords: Record<string, CrmRecord>;
  selectedProjectId: string | null;
  sortField: SortField;
  sortAsc: boolean;
  onSort: (field: SortField) => void;
  onSelectProject: (project: SpatialProject) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const STATUS_BADGE: Record<OutreachStatus, string> = {
  'Not Contacted': 'border-neutral-400 text-neutral-700 bg-white',
  'Email Sent': 'border-black text-black bg-neutral-100',
  'In Conversation': 'border-black text-white bg-neutral-700',
  'Committed for Jan CCC App': 'border-black text-white bg-black font-semibold',
};

export function ProjectTable({
  projects,
  crmRecords,
  selectedProjectId,
  sortField,
  sortAsc,
  onSort,
  onSelectProject,
  isFullscreen = false,
  onToggleFullscreen,
}: ProjectTableProps) {
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortAsc ? (
      <ArrowUp className="w-3 h-3 inline ml-0.5" />
    ) : (
      <ArrowDown className="w-3 h-3 inline ml-0.5" />
    );
  };

  return (
    <div className="h-full min-h-[380px] lg:min-h-0 flex flex-col bg-white overflow-hidden">
      <div className="border-b border-black bg-neutral-50 px-3 py-1.5 flex items-center justify-between gap-2 text-[11px] uppercase tracking-wider shrink-0">
        <span className="font-semibold truncate">
          Spatial CRM Ledger ({projects.length.toLocaleString()} Sites)
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden xl:inline text-neutral-500 font-mono-tabular">
            Click row for Dossier
          </span>
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className={`inline-flex items-center gap-1 border border-black px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider cursor-pointer ${
                isFullscreen
                  ? 'bg-black text-white hover:bg-neutral-800'
                  : 'bg-white text-black hover:bg-neutral-100'
              }`}
              title={
                isFullscreen
                  ? 'Exit Fullscreen Ledger (Esc)'
                  : 'Fullscreen Ledger'
              }
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3 h-3" />
                  <span>Exit Full</span>
                </>
              ) : (
                <>
                  <Expand className="w-3 h-3" />
                  <span>Full Ledger</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 bg-white border-b border-black text-[10px] uppercase tracking-wider text-neutral-600">
            <tr>
              <th className="py-2 px-2.5 border-r border-neutral-200 font-semibold">
                SCH / ID
              </th>
              <th
                onClick={() => onSort('title')}
                className="py-2 px-2.5 border-r border-neutral-200 font-semibold cursor-pointer hover:bg-neutral-100 select-none"
              >
                Project &amp; Lead Agency
                <SortIcon field="title" />
              </th>
              <th
                onClick={() => onSort('county')}
                className="py-2 px-2.5 border-r border-neutral-200 font-semibold cursor-pointer hover:bg-neutral-100 select-none"
              >
                County
                <SortIcon field="county" />
              </th>
              <th
                onClick={() => onSort('pathway')}
                className="py-2 px-2.5 border-r border-neutral-200 font-semibold cursor-pointer hover:bg-neutral-100 select-none"
              >
                CEQA Authority
                <SortIcon field="pathway" />
              </th>
              <th
                onClick={() => onSort('acres')}
                className="py-2 px-2.5 border-r border-neutral-200 font-semibold text-right cursor-pointer hover:bg-neutral-100 select-none"
              >
                Acres
                <SortIcon field="acres" />
              </th>
              <th
                onClick={() => onSort('distance')}
                className="py-2 px-2.5 border-r border-neutral-200 font-semibold text-right cursor-pointer hover:bg-neutral-100 select-none"
              >
                Dist (mi)
                <SortIcon field="distance" />
              </th>
              <th
                onClick={() => onSort('status')}
                className="py-2 px-2.5 font-semibold cursor-pointer hover:bg-neutral-100 select-none"
              >
                Outreach
                <SortIcon field="status" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {projects.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-12 px-4 text-center text-neutral-500 text-xs"
                >
                  No projects match the current spatial and CEQA filters. Adjust
                  your county selection, radius, or minimum acreage.
                </td>
              </tr>
            ) : (
              projects.map((p) => {
                const status =
                  crmRecords[p.id]?.outreachStatus ?? 'Not Contacted';
                const isSelected = p.id === selectedProjectId;
                return (
                  <tr
                    key={p.id}
                    onClick={() => onSelectProject(p)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-neutral-900 text-white'
                        : 'hover:bg-neutral-100 text-black'
                    }`}
                  >
                    <td className="py-2 px-2.5 border-r border-neutral-200/50 font-mono-tabular text-[11px] whitespace-nowrap align-top">
                      <div className="font-semibold">{p.schNumber}</div>
                      <div
                        className={`text-[9px] uppercase tracking-wider ${
                          isSelected ? 'text-neutral-300' : 'text-neutral-500'
                        }`}
                      >
                        {p.source === 'CEQAnet Import' ? 'CEQAnet' : p.source}
                      </div>
                      <div
                        className={`mt-0.5 inline-block border px-1 py-0 text-[8px] uppercase tracking-wider ${
                          isSelected
                            ? 'border-white/40 text-white'
                            : p.privacyScope === 'completely_private'
                              ? 'border-red-700 text-red-700'
                              : p.privacyScope === 'private_recorded'
                                ? 'border-amber-700 text-amber-800'
                                : 'border-neutral-400 text-neutral-600'
                        }`}
                      >
                        {p.privacyScope === 'completely_private'
                          ? 'Closed Private'
                          : p.privacyScope === 'private_recorded'
                            ? 'Private Recorded'
                            : 'Public'}
                      </div>
                    </td>
                    <td className="py-2 px-2.5 border-r border-neutral-200/50 align-top max-w-[260px]">
                      <div className="font-semibold leading-snug line-clamp-2">
                        {p.title}
                      </div>
                      <div
                        className={`text-[11px] truncate mt-0.5 ${
                          isSelected ? 'text-neutral-300' : 'text-neutral-500'
                        }`}
                      >
                        {p.leadAgency}
                      </div>
                    </td>
                    <td className="py-2 px-2.5 border-r border-neutral-200/50 whitespace-nowrap align-top">
                      {p.county}
                    </td>
                    <td className="py-2 px-2.5 border-r border-neutral-200/50 align-top">
                      <span
                        className={`inline-block border px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap ${
                          isSelected
                            ? 'border-white/50 text-white'
                            : 'border-black text-black'
                        }`}
                      >
                        {p.ceqaPathway}
                      </span>
                      <div
                        className={`text-[10px] mt-0.5 truncate max-w-[150px] ${
                          isSelected ? 'text-neutral-300' : 'text-neutral-500'
                        }`}
                      >
                        {p.treatmentCategories.join(' · ')}
                      </div>
                    </td>
                    <td className="py-2 px-2.5 border-r border-neutral-200/50 text-right font-mono-tabular whitespace-nowrap align-top">
                      {p.totalAcres > 0
                        ? p.totalAcres.toLocaleString()
                        : '—'}
                    </td>
                    <td className="py-2 px-2.5 border-r border-neutral-200/50 text-right font-mono-tabular whitespace-nowrap align-top">
                      {p.distanceFromOriginMiles.toFixed(1)}
                    </td>
                    <td className="py-2 px-2.5 align-top whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] ${
                          isSelected
                            ? 'border-white bg-white text-black font-semibold'
                            : STATUS_BADGE[status]
                        }`}
                      >
                        {status}
                      </span>
                      {p.psaLink && (
                        <a
                          href={p.psaLink}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className={`ml-1.5 inline-block align-middle ${
                            isSelected
                              ? 'text-neutral-300 hover:text-white'
                              : 'text-neutral-500 hover:text-black'
                          }`}
                          title="Open PSA / CEQAnet filing"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
