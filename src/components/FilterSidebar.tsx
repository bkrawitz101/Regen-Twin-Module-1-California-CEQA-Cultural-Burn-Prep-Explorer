import { useMemo, useState } from 'react';
import {
  ChevronDown,
  Compass,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  CA_COUNTIES,
  THREE_SUNS_ADDRESS,
  THREE_SUNS_DRIVESHED_34,
} from '../data/caCounties';
import type {
  CeqaPathway,
  FilterState,
  OriginPoint,
  OutreachStatus,
  TreatmentCategory,
  VisibilityFilter,
} from '../types';

interface FilterSidebarProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  origin: OriginPoint;
  isGeocoding: boolean;
  geocodeError: string | null;
  onGeocodeAddress: (address: string) => void;
  onResetOrigin: () => void;
}

const CEQA_PATHWAYS: Array<CeqaPathway | 'All'> = [
  'All',
  'CalVTP Certified',
  'SERP Statutory Exemption',
  'Class 4 NOE',
  'AB 211 / PRC 4799.05',
];

const TREATMENT_OPTIONS: Array<TreatmentCategory | 'All'> = [
  'All',
  'Prescribed/Cultural Burn',
  'Manual Hand-Crew Prep',
  'Shaded Fuel Break',
];

const OUTREACH_OPTIONS: Array<OutreachStatus | 'All'> = [
  'All',
  'Not Contacted',
  'Email Sent',
  'In Conversation',
  'Committed for Jan CCC App',
];

const VISIBILITY_OPTIONS: Array<{ value: VisibilityFilter; label: string }> = [
  { value: 'all', label: 'All Sites' },
  { value: 'hide_completely_private', label: 'Hide Completely Private' },
  { value: 'private_recorded_only', label: 'Private Recorded Only' },
  { value: 'completely_private_only', label: 'Completely Private Only' },
];

export function FilterSidebar({
  filters,
  onChange,
  origin,
  isGeocoding,
  geocodeError,
  onGeocodeAddress,
  onResetOrigin,
}: FilterSidebarProps) {
  const [addressDraft, setAddressDraft] = useState(origin.address);
  const [countyDropdownOpen, setCountyDropdownOpen] = useState(false);
  const [countySearch, setCountySearch] = useState('');
  const [collapsed, setCollapsed] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );

  const filteredCountyList = useMemo(() => {
    const q = countySearch.trim().toLowerCase();
    return q
      ? CA_COUNTIES.filter((c) => c.name.toLowerCase().includes(q))
      : CA_COUNTIES;
  }, [countySearch]);

  const isDriveshedActive =
    filters.selectedCounties.length === THREE_SUNS_DRIVESHED_34.length &&
    THREE_SUNS_DRIVESHED_34.every((c) => filters.selectedCounties.includes(c));

  const toggleCounty = (name: string) => {
    const exists = filters.selectedCounties.includes(name);
    const next = exists
      ? filters.selectedCounties.filter((c) => c !== name)
      : [...filters.selectedCounties, name];
    onChange({ ...filters, selectedCounties: next });
  };

  if (collapsed) {
    return (
      <div className="border-b border-black bg-neutral-50 px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2 text-xs shrink-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono-tabular min-w-0 truncate">
          <span className="font-semibold uppercase tracking-wider">
            Query:
          </span>
          <span>
            {filters.searchMode === 'county'
              ? filters.selectedCounties.length === 0
                ? 'All 58'
                : `${filters.selectedCounties.length} Counties`
              : `${filters.radiusMiles} mi`}
          </span>
          <span className="text-neutral-400">|</span>
          <span className="truncate">{filters.ceqaPathway}</span>
          <span className="hidden sm:inline text-neutral-400">|</span>
          <span className="hidden sm:inline">Min: {filters.minAcres} ac</span>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="border border-black bg-white px-2 py-0.5 text-[11px] uppercase tracking-wider font-medium cursor-pointer shrink-0"
        >
          Filters
        </button>
      </div>
    );
  }

  return (
    <section className="border-b border-black bg-white px-4 py-3 shrink-0">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        {/* Dual Spatial Search */}
        <div className="lg:col-span-5 border border-black p-2.5 bg-neutral-50">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex border border-black bg-white">
              <button
                type="button"
                onClick={() => onChange({ ...filters, searchMode: 'county' })}
                className={`px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider cursor-pointer transition-colors ${
                  filters.searchMode === 'county'
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-neutral-100'
                }`}
              >
                Mode A: County Picker
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...filters, searchMode: 'radius' })}
                className={`px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider border-l border-black cursor-pointer transition-colors ${
                  filters.searchMode === 'radius'
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-neutral-100'
                }`}
              >
                Mode B: Address + Radius
              </button>
            </div>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="text-[10px] uppercase tracking-wider text-neutral-500 hover:text-black cursor-pointer"
              title="Collapse filter deck"
            >
              Hide
            </button>
          </div>

          {filters.searchMode === 'county' ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...filters,
                      selectedCounties: isDriveshedActive
                        ? []
                        : [...THREE_SUNS_DRIVESHED_34],
                    })
                  }
                  className={`inline-flex items-center gap-1.5 border border-black px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider cursor-pointer transition-colors ${
                    isDriveshedActive
                      ? 'bg-black text-white'
                      : 'bg-white text-black hover:bg-neutral-100'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>3 Suns 4-Hour Drive Shed (34 Counties)</span>
                </button>

                <div className="relative flex-1 min-w-[180px]">
                  <button
                    type="button"
                    onClick={() => setCountyDropdownOpen((o) => !o)}
                    className="w-full flex items-center justify-between border border-black bg-white px-2.5 py-1 text-xs cursor-pointer"
                  >
                    <span className="truncate font-medium">
                      {filters.selectedCounties.length === 0
                        ? 'All 58 California Counties'
                        : `${filters.selectedCounties.length} Counties Selected`}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 shrink-0 ml-1" />
                  </button>

                  {countyDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-40 border border-black bg-white shadow-none">
                      <div className="p-1.5 border-b border-black flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                        <input
                          type="text"
                          value={countySearch}
                          onChange={(e) => setCountySearch(e.target.value)}
                          placeholder="Search 58 CA counties..."
                          className="w-full text-xs outline-none bg-transparent"
                          autoFocus
                        />
                        {filters.selectedCounties.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              onChange({ ...filters, selectedCounties: [] })
                            }
                            className="text-[10px] uppercase tracking-wider underline cursor-pointer shrink-0"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="max-h-56 overflow-y-auto divide-y divide-neutral-200">
                        {filteredCountyList.map((c) => {
                          const checked = filters.selectedCounties.includes(c.name);
                          return (
                            <label
                              key={c.name}
                              className="flex items-center justify-between px-2.5 py-1.5 text-xs hover:bg-neutral-100 cursor-pointer"
                            >
                              <span className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleCounty(c.name)}
                                  className="accent-black"
                                />
                                <span className={checked ? 'font-semibold' : ''}>
                                  {c.name}
                                </span>
                              </span>
                              {THREE_SUNS_DRIVESHED_34.includes(c.name) && (
                                <span className="text-[9px] uppercase tracking-wider border border-neutral-400 px-1 text-neutral-600">
                                  4H Shed
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                      <div className="border-t border-black p-1.5 flex justify-end bg-neutral-50">
                        <button
                          type="button"
                          onClick={() => setCountyDropdownOpen(false)}
                          className="bg-black text-white px-2.5 py-0.5 text-[11px] uppercase tracking-wider cursor-pointer"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {filters.selectedCounties.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onChange({ ...filters, selectedCounties: [] })}
                    className="border border-black bg-white hover:bg-neutral-100 px-2 py-1 text-[11px] uppercase tracking-wider cursor-pointer"
                  >
                    Reset All
                  </button>
                )}
              </div>

              {filters.selectedCounties.length > 0 && (
                <div className="flex flex-wrap gap-1 max-h-14 overflow-y-auto pt-0.5">
                  {filters.selectedCounties.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCounty(c)}
                      className="inline-flex items-center gap-1 border border-black bg-white px-1.5 py-0.5 text-[10px] font-medium hover:bg-black hover:text-white cursor-pointer"
                    >
                      <span>{c}</span>
                      <X className="w-2.5 h-2.5" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onGeocodeAddress(addressDraft);
                }}
                className="flex items-center gap-1.5"
              >
                <div className="relative flex-1">
                  <MapPin className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    value={addressDraft}
                    onChange={(e) => setAddressDraft(e.target.value)}
                    placeholder={THREE_SUNS_ADDRESS}
                    className="w-full border border-black bg-white pl-7 pr-2 py-1 text-xs outline-none focus:bg-neutral-50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isGeocoding}
                  className="border border-black bg-black text-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider cursor-pointer disabled:opacity-50"
                >
                  {isGeocoding ? 'Locating' : 'Set Origin'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddressDraft(THREE_SUNS_ADDRESS);
                    onResetOrigin();
                  }}
                  title="Reset to 3 Suns Farm, Nevada City"
                  className="border border-black bg-white hover:bg-neutral-100 p-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="flex items-center gap-3">
                <label className="text-[11px] uppercase tracking-wider font-semibold shrink-0">
                  Turf Radius:
                </label>
                <input
                  type="range"
                  min={10}
                  max={250}
                  step={5}
                  value={filters.radiusMiles}
                  onChange={(e) =>
                    onChange({
                      ...filters,
                      radiusMiles: Number(e.target.value),
                    })
                  }
                  className="flex-1 accent-black cursor-pointer"
                />
                <span className="font-mono-tabular text-xs font-semibold border border-black bg-white px-2 py-0.5 min-w-[64px] text-center">
                  {filters.radiusMiles} MI
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono-tabular text-neutral-600">
                <span>
                  Origin: {origin.coords[1].toFixed(4)}°N,{' '}
                  {Math.abs(origin.coords[0]).toFixed(4)}°W ({origin.source})
                </span>
                {geocodeError && (
                  <span className="text-black font-semibold">{geocodeError}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* CEQA Pathway + Treatment + Acreage + Text Search */}
        <div className="lg:col-span-7 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mr-1">
              CEQA Pathway:
            </span>
            {CEQA_PATHWAYS.map((pathway) => (
              <button
                key={pathway}
                type="button"
                onClick={() => onChange({ ...filters, ceqaPathway: pathway })}
                className={`border border-black px-2 py-0.5 text-[11px] font-medium cursor-pointer transition-colors ${
                  filters.ceqaPathway === pathway
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-neutral-100'
                }`}
              >
                {pathway}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mr-1">
              Treatment:
            </span>
            {TREATMENT_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onChange({ ...filters, treatmentFilter: t })}
                className={`border border-black px-2 py-0.5 text-[11px] font-medium cursor-pointer transition-colors ${
                  filters.treatmentFilter === t
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-neutral-100'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mr-1">
              Site Access:
            </span>
            {VISIBILITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  onChange({ ...filters, visibilityFilter: opt.value })
                }
                className={`border border-black px-2 py-0.5 text-[11px] font-medium cursor-pointer transition-colors ${
                  filters.visibilityFilter === opt.value
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-neutral-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-0.5">
            <div className="sm:col-span-5 relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                value={filters.searchQuery}
                onChange={(e) =>
                  onChange({ ...filters, searchQuery: e.target.value })
                }
                placeholder="Search SCH #, project title, or lead agency..."
                className="w-full border border-black bg-white pl-7 pr-2 py-1 text-xs outline-none"
              />
            </div>

            <div className="sm:col-span-3 flex items-center border border-black bg-white px-2 py-1 gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              <span className="text-[10px] uppercase tracking-wider text-neutral-500 shrink-0">
                Min Ac:
              </span>
              <input
                type="number"
                min={0}
                step={25}
                value={filters.minAcres}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    minAcres: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="w-full text-xs font-mono-tabular outline-none bg-transparent"
              />
            </div>

            <div className="sm:col-span-4 flex items-center border border-black bg-white px-2 py-1 gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-neutral-500 shrink-0">
                CRM:
              </span>
              <select
                value={filters.outreachFilter}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    outreachFilter: e.target.value as OutreachStatus | 'All',
                  })
                }
                className="w-full text-xs bg-transparent outline-none cursor-pointer"
              >
                {OUTREACH_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s === 'All' ? 'All Outreach Statuses' : s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
