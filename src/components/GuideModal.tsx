import { useEffect, useState } from 'react';
import { BookOpen, Download, Layers, Search, X } from 'lucide-react';
import { FEATURES_CATALOG } from '../data/featuresCatalog';
import { GUIDE_SECTIONS } from '../data/guideCatalog';

export type GuideTab = 'guide' | 'features';

interface GuideModalProps {
  open: boolean;
  initialTab?: GuideTab;
  onClose: () => void;
}

export function GuideModal({
  open,
  initialTab = 'guide',
  onClose,
}: GuideModalProps) {
  const [activeTab, setActiveTab] = useState<GuideTab>(initialTab);
  const [featureQuery, setFeatureQuery] = useState('');

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  if (!open) return null;

  const base = import.meta.env.BASE_URL;
  const q = featureQuery.trim().toLowerCase();

  const filteredCatalog = FEATURES_CATALOG.map((cat) => ({
    ...cat,
    items: q
      ? cat.items.filter((it) =>
          `${it.name} ${it.summary} ${it.details}`.toLowerCase().includes(q)
        )
      : cat.items,
  })).filter((cat) => cat.items.length > 0);

  const activePdfHref =
    activeTab === 'guide'
      ? `${base}Regen-Twin-Module-1-User-Guide.pdf`
      : `${base}Regen-Twin-Module-1-Features.pdf`;
  const activePdfName =
    activeTab === 'guide'
      ? 'Regen-Twin-Module-1-User-Guide.pdf'
      : 'Regen-Twin-Module-1-Features.pdf';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-4xl bg-white border border-black flex flex-col max-h-[92vh]">
        {/* Header + Tabs */}
        <div className="bg-black text-white px-4 pt-3 pb-0 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {activeTab === 'guide' ? (
                <BookOpen className="w-4 h-4 shrink-0" />
              ) : (
                <Layers className="w-4 h-4 shrink-0" />
              )}
              <div>
                <div className="text-[10px] font-mono-tabular uppercase tracking-widest text-neutral-300">
                  Regen Twin // Module 1 Documentation
                </div>
                <h2 className="text-sm sm:text-base font-semibold">
                  {activeTab === 'guide'
                    ? 'Comprehensive Visual User Guide'
                    : 'All Features & Capabilities'}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={activePdfHref}
                download={activePdfName}
                className="inline-flex items-center gap-1.5 border border-white/60 bg-white text-black hover:bg-neutral-200 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {activeTab === 'guide' ? 'User Guide PDF' : 'Features PDF'}
                </span>
                <span className="sm:hidden">PDF</span>
              </a>
              <button
                type="button"
                onClick={onClose}
                className="border border-white/40 p-1 hover:bg-white hover:text-black cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider cursor-pointer border-t border-l border-r ${
                activeTab === 'guide'
                  ? 'bg-white text-black border-white'
                  : 'bg-neutral-900 text-neutral-300 border-white/25 hover:text-white'
              }`}
            >
              User Guide ({GUIDE_SECTIONS.length} Steps)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('features')}
              className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider cursor-pointer border-t border-l border-r ${
                activeTab === 'features'
                  ? 'bg-white text-black border-white'
                  : 'bg-neutral-900 text-neutral-300 border-white/25 hover:text-white'
              }`}
            >
              All Features ({FEATURES_CATALOG.reduce((a, c) => a + c.items.length, 0)})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'guide' ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50">
            <div className="border border-black bg-white p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span>
                Plain-language walkthrough covering search modes, 3D topo &amp;
                satellite rotation, private-recorded sites, pane resizing,
                Recorded Studies, CRM, and CCC exports.
              </span>
              <a
                href={`${base}Regen-Twin-Module-1-User-Guide.pdf`}
                download="Regen-Twin-Module-1-User-Guide.pdf"
                className="inline-flex items-center gap-1.5 border border-black bg-black text-white hover:bg-neutral-800 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download User Guide PDF</span>
              </a>
            </div>

            {GUIDE_SECTIONS.map((item) => (
              <div
                key={item.step}
                className="border border-black bg-white grid grid-cols-1 md:grid-cols-12 overflow-hidden"
              >
                <div className="md:col-span-5 border-b md:border-b-0 md:border-r border-black bg-neutral-100 p-2 flex items-center justify-center">
                  <img
                    src={`${base}${item.image}`}
                    alt={item.alt}
                    className="w-full h-auto block"
                  />
                </div>
                <div className="md:col-span-7 p-3.5 space-y-2">
                  <div className="inline-block bg-black text-white px-2 py-0.5 text-[10px] font-mono-tabular font-semibold uppercase tracking-wider">
                    {item.step}
                  </div>
                  <h3 className="text-sm font-bold text-black">{item.title}</h3>
                  <p className="text-xs text-neutral-600">{item.summary}</p>
                  <ul className="space-y-1.5 text-xs text-neutral-800 leading-relaxed list-disc pl-4">
                    {item.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-black p-2.5">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  value={featureQuery}
                  onChange={(e) => setFeatureQuery(e.target.value)}
                  placeholder="Filter features (e.g., satellite, gimbal, CCED, CEQAnet, offline)..."
                  className="w-full pl-8 pr-2 py-1 text-xs outline-none bg-transparent"
                />
              </div>
              <a
                href={`${base}Regen-Twin-Module-1-Features.pdf`}
                download="Regen-Twin-Module-1-Features.pdf"
                className="inline-flex items-center gap-1.5 border border-black bg-black text-white hover:bg-neutral-800 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Features PDF</span>
              </a>
            </div>

            {filteredCatalog.map((cat) => (
              <div key={cat.id} className="border border-black bg-white">
                <div className="bg-black text-white px-3 py-2 flex items-center gap-2.5">
                  <span className="font-mono-tabular text-xs font-bold border border-white/40 px-1.5 py-0.5">
                    {cat.code}
                  </span>
                  <div>
                    <div className="text-xs font-bold">{cat.title}</div>
                    <div className="text-[10px] text-neutral-300">
                      {cat.subtitle}
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-neutral-200">
                  {cat.items.map((item) => (
                    <div
                      key={item.name}
                      className="p-3 grid grid-cols-1 md:grid-cols-12 gap-2 text-xs"
                    >
                      <div className="md:col-span-4 font-bold text-black">
                        {item.name}
                      </div>
                      <div className="md:col-span-4 text-neutral-800">
                        {item.summary}
                      </div>
                      <div className="md:col-span-4 text-neutral-600 text-[11px]">
                        {item.details}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-black bg-white px-4 py-2.5 flex items-center justify-between text-xs">
          <span className="text-neutral-600">
            Works online or offline (Starlink/solar cache built in).
          </span>
          <button
            type="button"
            onClick={onClose}
            className="border border-black bg-black text-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider cursor-pointer hover:bg-neutral-800"
          >
            Got It — Back to Explorer
          </button>
        </div>
      </div>
    </div>
  );
}
