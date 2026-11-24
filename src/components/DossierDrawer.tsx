import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Crosshair,
  Expand,
  ExternalLink,
  Mail,
  Minimize2,
  Send,
  X,
} from 'lucide-react';
import { generateReturnCaOutreachEmail } from '../lib/exports';
import { RecordedIndicatorsPanel } from './RecordedIndicatorsPanel';
import type { CrmRecord, OutreachStatus, SpatialProject } from '../types';

interface DossierDrawerProps {
  project: SpatialProject | null;
  allProjects: SpatialProject[];
  crmRecord?: CrmRecord;
  onClose: () => void;
  onUpdateCrm: (projectId: string, patch: Partial<CrmRecord>) => void;
  onZoomToSite: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const OUTREACH_STATUSES: OutreachStatus[] = [
  'Not Contacted',
  'Email Sent',
  'In Conversation',
  'Committed for Jan CCC App',
];

export function DossierDrawer({
  project,
  allProjects,
  crmRecord,
  onClose,
  onUpdateCrm,
  onZoomToSite,
  isFullscreen = false,
  onToggleFullscreen,
}: DossierDrawerProps) {
  const [emailDraft, setEmailDraft] = useState<{
    subject: string;
    body: string;
    to: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setEmailDraft(null);
    setCopied(false);
  }, [project?.id]);

  if (!project) return null;

  const status = crmRecord?.outreachStatus ?? 'Not Contacted';
  const notes = crmRecord?.notes ?? '';
  const contactName = crmRecord?.contactNameOverride ?? project.contactName;
  const contactEmail = crmRecord?.contactEmailOverride ?? project.contactEmail;
  const contactPhone = crmRecord?.contactPhoneOverride ?? project.contactPhone;

  const handleGenerateEmail = () => {
    const draft = generateReturnCaOutreachEmail(project, crmRecord);
    setEmailDraft(draft);
  };

  const handleCopyEmail = async () => {
    if (!emailDraft) return;
    const full = `To: ${emailDraft.to || '[Agency Contact Email]'}\nSubject: ${
      emailDraft.subject
    }\n\n${emailDraft.body}`;
    await navigator.clipboard.writeText(full);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const mailtoHref = emailDraft
    ? `mailto:${encodeURIComponent(emailDraft.to)}?subject=${encodeURIComponent(
        emailDraft.subject
      )}&body=${encodeURIComponent(emailDraft.body)}`
    : '#';

  return (
    <aside
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-white flex flex-col'
          : 'fixed inset-0 z-50 lg:static lg:z-auto lg:h-full w-full bg-white flex flex-col min-h-0'
      }
    >
      {/* Header */}
      <div className="border-b border-black px-4 py-3 flex items-start justify-between gap-3 bg-black text-white shrink-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono-tabular uppercase tracking-wider text-neutral-300">
            <span className="border border-white/40 px-1.5 py-0.5 text-white">
              SCH / ID: {project.schNumber}
            </span>
            <span>{project.source}</span>
            <span>·</span>
            <span className="border border-white/30 px-1 py-0">
              {project.accessLabel}
            </span>
            <span>·</span>
            <span>{project.dateLabel}</span>
          </div>
          <h2 className="text-sm sm:text-base font-semibold leading-snug mt-1.5">
            {project.title}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="inline-flex items-center gap-1 border border-white/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider hover:bg-white hover:text-black cursor-pointer"
              title={
                isFullscreen
                  ? 'Exit Fullscreen Dossier (Esc)'
                  : 'Fullscreen Dossier'
              }
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Exit Full</span>
                </>
              ) : (
                <>
                  <Expand className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Full</span>
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="border border-white/40 p-1 hover:bg-white hover:text-black cursor-pointer"
            aria-label="Close dossier"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onZoomToSite}
            className="inline-flex items-center gap-1.5 border border-black bg-white hover:bg-neutral-100 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Zoom on Map</span>
          </button>

          <button
            type="button"
            onClick={handleGenerateEmail}
            className="inline-flex items-center gap-1.5 border border-black bg-black text-white hover:bg-neutral-800 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Generate Return CA Outreach Email</span>
          </button>

          {project.psaLink && (
            <a
              href={project.psaLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 border border-black bg-white hover:bg-neutral-100 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider"
            >
              <span>PSA / Filing</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Spatial & CEQA Telemetry */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border border-black divide-y sm:divide-y-0 sm:divide-x divide-black">
          <div className="p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-neutral-500">
              Total Footprint
            </div>
            <div className="font-mono-tabular text-sm font-bold mt-0.5">
              {project.totalAcres > 0
                ? `${project.totalAcres.toLocaleString()} ac`
                : 'Unspecified'}
            </div>
          </div>
          <div className="p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-neutral-500">
              From 3 Suns Farm
            </div>
            <div className="font-mono-tabular text-sm font-bold mt-0.5">
              {project.distanceFromThreeSunsMiles.toFixed(1)} mi
            </div>
          </div>
          <div className="p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-neutral-500">
              From Active Origin
            </div>
            <div className="font-mono-tabular text-sm font-bold mt-0.5">
              {project.distanceFromOriginMiles.toFixed(1)} mi
            </div>
          </div>
          <div className="p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-neutral-500">
              County
            </div>
            <div className="text-sm font-bold mt-0.5 truncate">
              {project.counties.join(', ')}
            </div>
          </div>
        </div>

        {/* CEQA Authority & Treatment Breakdown */}
        <div className="border border-black p-3 space-y-2">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              CEQA Authority &amp; Treatment Matrix
            </span>
            <span className="border border-black px-1.5 py-0.5 text-[10px] font-semibold">
              {project.ceqaPathway}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-neutral-500 block text-[10px] uppercase">
                Document / Exemption Status
              </span>
              <span className="font-medium">{project.exemptStatus}</span>
            </div>
            <div>
              <span className="text-neutral-500 block text-[10px] uppercase">
                Burn-Prep &amp; Treatment Categories
              </span>
              <span className="font-medium">
                {project.treatmentCategories.join(', ')}
              </span>
            </div>
          </div>

          {(project.rxBroadcastAcres > 0 ||
            project.rxPileAcres > 0 ||
            project.manualAcres > 0 ||
            project.mechanicalAcres > 0) && (
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-neutral-200 font-mono-tabular text-[11px]">
              <div>
                <span className="text-neutral-500 block text-[9px] uppercase">
                  Rx Broadcast
                </span>
                <strong>{project.rxBroadcastAcres.toLocaleString()} ac</strong>
              </div>
              <div>
                <span className="text-neutral-500 block text-[9px] uppercase">
                  Rx Pile
                </span>
                <strong>{project.rxPileAcres.toLocaleString()} ac</strong>
              </div>
              <div>
                <span className="text-neutral-500 block text-[9px] uppercase">
                  Manual Prep
                </span>
                <strong>{project.manualAcres.toLocaleString()} ac</strong>
              </div>
              <div>
                <span className="text-neutral-500 block text-[9px] uppercase">
                  Mechanical
                </span>
                <strong>{project.mechanicalAcres.toLocaleString()} ac</strong>
              </div>
            </div>
          )}

          {project.description && (
            <p className="text-neutral-700 leading-relaxed pt-1 border-t border-neutral-200">
              {project.description}
            </p>
          )}
        </div>

        {/* Recorded Studies & Private Data Indicators */}
        <RecordedIndicatorsPanel project={project} allProjects={allProjects} />

        {/* Lead Agency & Editable Contact CRM */}
        <div className="border border-black p-3 space-y-2.5 bg-neutral-50">
          <div className="flex items-center justify-between border-b border-neutral-300 pb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
              Lead Agency &amp; Outreach CRM
            </span>
            <span className="font-mono-tabular text-[10px] text-neutral-500">
              {crmRecord?.updatedAt
                ? `Saved ${crmRecord.updatedAt.slice(0, 10)}`
                : 'Auto-persisted locally'}
            </span>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-0.5">
              Lead Agency / Project Proponent
            </label>
            <div className="font-semibold text-sm">{project.leadAgency}</div>
            {project.contactAddress && (
              <div className="text-[11px] text-neutral-600 mt-0.5">
                {project.contactAddress}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-0.5">
                Contact Name
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) =>
                  onUpdateCrm(project.id, {
                    contactNameOverride: e.target.value,
                  })
                }
                placeholder="Agency Lead"
                className="w-full border border-black bg-white px-2 py-1 text-xs outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-0.5">
                Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) =>
                  onUpdateCrm(project.id, {
                    contactEmailOverride: e.target.value,
                  })
                }
                placeholder="email@agency.ca.gov"
                className="w-full border border-black bg-white px-2 py-1 text-xs outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-0.5">
                Contact Phone
              </label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) =>
                  onUpdateCrm(project.id, {
                    contactPhoneOverride: e.target.value,
                  })
                }
                placeholder="530-..."
                className="w-full border border-black bg-white px-2 py-1 text-xs font-mono-tabular outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 pt-1">
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-black mb-1">
                Outreach Status (Jan CCC Pipeline)
              </label>
              <select
                value={status}
                onChange={(e) =>
                  onUpdateCrm(project.id, {
                    outreachStatus: e.target.value as OutreachStatus,
                  })
                }
                className="w-full border border-black bg-white px-2.5 py-1.5 text-xs font-semibold outline-none cursor-pointer"
              >
                {OUTREACH_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-black mb-1">
                Outreach &amp; Crew Logistics Notes
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) =>
                  onUpdateCrm(project.id, { notes: e.target.value })
                }
                placeholder="Log call outcomes, sponsor letter interest, access gates, burn window constraints..."
                className="w-full border border-black bg-white p-2 text-xs outline-none resize-y"
              />
            </div>
          </div>
        </div>

        {/* Generated Return CA Outreach Email */}
        {emailDraft && (
          <div className="border border-black p-3 space-y-2 bg-white">
            <div className="flex items-center justify-between border-b border-black pb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider">
                Return CA Outreach Draft (SCH / ID: {project.schNumber})
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="inline-flex items-center gap-1 border border-black bg-white hover:bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <a
                  href={mailtoHref}
                  onClick={() => {
                    if (status === 'Not Contacted') {
                      onUpdateCrm(project.id, { outreachStatus: 'Email Sent' });
                    }
                  }}
                  className="inline-flex items-center gap-1 border border-black bg-black text-white hover:bg-neutral-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                >
                  <Send className="w-3 h-3" />
                  <span>Open Mail</span>
                </a>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase text-neutral-500 block">
                Subject
              </label>
              <input
                type="text"
                value={emailDraft.subject}
                onChange={(e) =>
                  setEmailDraft({ ...emailDraft, subject: e.target.value })
                }
                className="w-full border border-neutral-300 px-2 py-1 text-xs font-medium mt-0.5"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase text-neutral-500 block">
                Body
              </label>
              <textarea
                rows={11}
                value={emailDraft.body}
                onChange={(e) =>
                  setEmailDraft({ ...emailDraft, body: e.target.value })
                }
                className="w-full border border-neutral-300 p-2 text-xs leading-relaxed mt-0.5"
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
