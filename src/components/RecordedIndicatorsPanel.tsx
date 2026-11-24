import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  FileSearch,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import {
  buildCpraOutreachRequest,
  fetchAllRecordedIndicators,
  retrySingleIndicatorLayer,
  type IndicatorLayerStatus,
  type RecordedIndicatorsBundle,
} from '../services/recordedIndicators';
import type { SpatialProject } from '../types';

interface RecordedIndicatorsPanelProps {
  project: SpatialProject;
  allProjects: SpatialProject[];
}

function StatusPill({
  status,
  fromCache,
  onRetry,
}: {
  status: IndicatorLayerStatus;
  fromCache?: boolean;
  onRetry?: () => void;
}) {
  if (status === 'loading') {
    return (
      <span className="border border-neutral-400 px-1.5 py-0.5 text-[10px] font-mono-tabular uppercase tracking-wider text-neutral-600">
        Scanning...
      </span>
    );
  }
  if (status === 'recorded') {
    return (
      <span className="border border-black bg-black text-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
        Recorded{fromCache ? ' (Cached)' : ''}
      </span>
    );
  }
  if (status === 'none') {
    return (
      <span className="border border-neutral-400 bg-white text-neutral-600 px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
        None Found
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onRetry}
      className="inline-flex items-center gap-1 border border-black bg-neutral-100 hover:bg-black hover:text-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider cursor-pointer"
    >
      <RefreshCw className="w-2.5 h-2.5" />
      <span>Source Temporarily Unavailable — Retry</span>
    </button>
  );
}

export function RecordedIndicatorsPanel({
  project,
  allProjects,
}: RecordedIndicatorsPanelProps) {
  const [bundle, setBundle] = useState<RecordedIndicatorsBundle | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewDraft, setPreviewDraft] = useState<{
    label: string;
    text: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setPreviewDraft(null);
    setCopiedId(null);

    void fetchAllRecordedIndicators(project, allProjects).then((res) => {
      if (!active) return;
      setBundle(res);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [project.id, allProjects.length]);

  const handleRefreshAll = async () => {
    setLoading(true);
    const res = await fetchAllRecordedIndicators(project, allProjects, true);
    setBundle(res);
    setLoading(false);
  };

  const handleRetryLayer = async (layer: 'cced' | 'calfire' | 'ace') => {
    if (!bundle) return;
    setBundle({
      ...bundle,
      [layer]: { status: 'loading', items: [] },
    });
    const next = await retrySingleIndicatorLayer(layer, project, bundle);
    setBundle(next);
  };

  const handleCopyCpra = async (params: {
    id: string;
    recipientOrg: string;
    referenceLabel: string;
    studyKind: string;
  }) => {
    const text = buildCpraOutreachRequest({
      project,
      recipientOrg: params.recipientOrg,
      referenceLabel: params.referenceLabel,
      studyKind: params.studyKind,
    });
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard fallback: still show preview box below
    }
    setCopiedId(params.id);
    setPreviewDraft({ label: params.referenceLabel, text });
    window.setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="border border-black p-3 space-y-3 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-black pb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <FileSearch className="w-4 h-4 shrink-0" />
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider">
              Recorded Studies &amp; Private Data Indicators
            </div>
            <div className="text-[10px] text-neutral-500">
              Public spatial intersection across CCED, CalVTP/CalTREES, CEQAnet
              &amp; CDFW ACE
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleRefreshAll()}
          disabled={loading}
          className="inline-flex items-center gap-1 border border-black bg-white hover:bg-neutral-100 disabled:opacity-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider cursor-pointer shrink-0"
          title="Re-query live California GIS endpoints"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Scanning' : 'Re-Scan'}</span>
        </button>
      </div>

      {/* 1. CCED Conservation Easements */}
      <div className="border border-neutral-300 p-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider">
            1. Conservation Easements (CCED)
          </span>
          <StatusPill
            status={loading || !bundle ? 'loading' : bundle.cced.status}
            fromCache={bundle?.cced.fromCache}
            onRetry={() => void handleRetryLayer('cced')}
          />
        </div>

        {bundle?.cced.status === 'recorded' &&
          bundle.cced.items.map((item) => (
            <div
              key={item.id}
              className="border-t border-neutral-200 pt-2 space-y-1.5"
            >
              <div className="text-[11px] font-semibold leading-snug">
                {item.badgeText}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono-tabular text-[10px] text-neutral-600">
                <span>Site: {item.sitename}</span>
                <span>Level: {item.heldlevel}</span>
                <span>Est: {item.year_est}</span>
                <span>Acres: {item.gis_acres.toLocaleString()}</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  void handleCopyCpra({
                    id: item.id,
                    recipientOrg: item.esmthldr,
                    referenceLabel: `Conservation Easement "${item.sitename}"`,
                    studyKind:
                      'a recorded CCED Conservation Easement and Baseline Ecological Report',
                  })
                }
                className="inline-flex items-center gap-1 border border-black bg-white hover:bg-black hover:text-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wider cursor-pointer"
              >
                {copiedId === item.id ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>CPRA Request Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Outreach / Records Request</span>
                  </>
                )}
              </button>
            </div>
          ))}
      </div>

      {/* 2. CAL FIRE CalVTP & CalTREES */}
      <div className="border border-neutral-300 p-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider">
            2. CAL FIRE CalVTP &amp; CalTREES Plans
          </span>
          <StatusPill
            status={loading || !bundle ? 'loading' : bundle.calfire.status}
            fromCache={bundle?.calfire.fromCache}
            onRetry={() => void handleRetryLayer('calfire')}
          />
        </div>

        {bundle?.calfire.status === 'recorded' &&
          bundle.calfire.items.map((item) => (
            <div
              key={item.id}
              className="border-t border-neutral-200 pt-2 space-y-1.5"
            >
              <div className="text-[11px] font-semibold leading-snug">
                {item.badgeText}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono-tabular text-[10px] text-neutral-600">
                <span>ID: {item.planNumber}</span>
                <span>Agency: {item.leadAgency}</span>
                <span>Status: {item.status}</span>
                <span>Approved: {item.approvalDate}</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  void handleCopyCpra({
                    id: item.id,
                    recipientOrg: item.leadAgency,
                    referenceLabel: `${item.sourceLabel} ${item.planNumber} (${item.projectName})`,
                    studyKind:
                      'a CAL FIRE / CalTREES or CalVTP filing with botanical, soil, and cultural surveys',
                  })
                }
                className="inline-flex items-center gap-1 border border-black bg-white hover:bg-black hover:text-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wider cursor-pointer"
              >
                {copiedId === item.id ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>CPRA Request Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Outreach / Records Request</span>
                  </>
                )}
              </button>
            </div>
          ))}
      </div>

      {/* 3. CEQAnet OPR Lookup */}
      <div className="border border-neutral-300 p-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider">
            3. CEQAnet Filing Lookup (OPR)
          </span>
          <StatusPill
            status={loading || !bundle ? 'loading' : bundle.ceqanet.status}
          />
        </div>

        {bundle?.ceqanet.status === 'recorded' &&
          bundle.ceqanet.items.map((item) => (
            <div
              key={item.id}
              className="border-t border-neutral-200 pt-2 space-y-1.5"
            >
              <div className="text-[11px] font-semibold leading-snug">
                {item.badgeText}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono-tabular text-[10px] text-neutral-600">
                <span>Title: {item.title}</span>
                <span>Received: {item.receivedDate}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    void handleCopyCpra({
                      id: item.id,
                      recipientOrg: item.leadAgency,
                      referenceLabel: `SCH #${item.schNumber} — ${item.title}`,
                      studyKind: `a ${item.documentType} CEQA record`,
                    })
                  }
                  className="inline-flex items-center gap-1 border border-black bg-white hover:bg-black hover:text-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wider cursor-pointer"
                >
                  {copiedId === item.id ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>CPRA Request Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Outreach / Records Request</span>
                    </>
                  )}
                </button>
                <a
                  href={item.lookupUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 border border-neutral-400 px-2 py-1 text-[10px] uppercase tracking-wider hover:border-black"
                >
                  <span>Verify on CEQAnet</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          ))}
      </div>

      {/* 4. CDFW ACE Sensitive Species Quad Flag */}
      <div className="border border-neutral-300 p-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider">
            4. Sensitive Species Flag (CDFW ACE)
          </span>
          <StatusPill
            status={loading || !bundle ? 'loading' : bundle.ace.status}
            fromCache={bundle?.ace.fromCache}
            onRetry={() => void handleRetryLayer('ace')}
          />
        </div>

        {bundle?.ace.status === 'recorded' &&
          bundle.ace.items.map((item) => (
            <div
              key={item.id}
              className="border-t border-neutral-200 pt-2 space-y-1"
            >
              <div className="flex items-start gap-1.5 text-[11px] font-semibold leading-snug">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{item.badgeText}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono-tabular text-[10px] text-neutral-600">
                <span>Hex: #{item.hexId}</span>
                <span>{item.rareRank}</span>
                <span>Taxa: {item.taxonomicSummary}</span>
                <span>Eco: {item.ecoName}</span>
              </div>
            </div>
          ))}
      </div>

      {/* Inline CPRA / Partner Data-Sharing Draft Preview */}
      {previewDraft && (
        <div className="border border-black bg-neutral-50 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider">
            <span>CPRA / Data-Sharing Request ({previewDraft.label})</span>
            <button
              type="button"
              onClick={() => setPreviewDraft(null)}
              className="underline cursor-pointer"
            >
              Close
            </button>
          </div>
          <textarea
            readOnly
            rows={7}
            value={previewDraft.text}
            className="w-full border border-neutral-400 bg-white p-2 text-[11px] leading-relaxed outline-none"
          />
        </div>
      )}
    </div>
  );
}
