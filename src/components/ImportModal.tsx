import { useRef, useState } from 'react';
import {
  CheckCircle2,
  DatabaseBackup,
  FileUp,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { SAMPLE_CEQANET_CSV } from '../data/sampleCeqanetCsv';
import { parseCeqanetCsv, parseCeqanetFile } from '../lib/ceqanetImport';
import { exportJsonBackup } from '../lib/exports';
import { buildBackupPayload, parseBackupPayload } from '../lib/storage';
import type { CrmRecord, SpatialProject } from '../types';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  originCoords: [number, number];
  importedProjects: SpatialProject[];
  crmRecords: Record<string, CrmRecord>;
  onMergeImported: (projects: SpatialProject[]) => void;
  onClearImported: () => void;
  onRestoreBackup: (
    crm: Record<string, CrmRecord>,
    imported: SpatialProject[]
  ) => void;
}

export function ImportModal({
  open,
  onClose,
  originCoords,
  importedProjects,
  crmRecords,
  onMergeImported,
  onClearImported,
  onRestoreBackup,
}: ImportModalProps) {
  const [dragging, setDragging] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const backupInputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const allImported: SpatialProject[] = [];
    const allWarnings: string[] = [];

    for (const file of Array.from(files)) {
      try {
        const text = await file.text();
        const res = parseCeqanetFile(file.name, text, originCoords);
        allImported.push(...res.projects);
        allWarnings.push(...res.warnings);
      } catch (err) {
        allWarnings.push(
          `Failed to parse ${file.name}: ${
            err instanceof Error ? err.message : 'Unknown error'
          }`
        );
      }
    }

    if (allImported.length > 0) {
      onMergeImported(allImported);
      setStatusMessage(
        `Merged ${allImported.length} CEQAnet / spatial record(s) into unified database.`
      );
    }
    setWarnings(allWarnings);
  };

  const handleLoadSample = () => {
    const res = parseCeqanetCsv(SAMPLE_CEQANET_CSV, originCoords);
    onMergeImported(res.projects);
    setStatusMessage(
      `Loaded ${res.projects.length} sample CEQAnet NOE/NOD records (including City/County geocoding fallback rows).`
    );
    setWarnings(res.warnings);
  };

  const handleBackupRestore = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const text = await files[0].text();
      const payload = parseBackupPayload(text);
      onRestoreBackup(payload.crmRecords, payload.importedProjects);
      setStatusMessage(
        `Restored ${Object.keys(payload.crmRecords).length} CRM status/note record(s) and ${
          payload.importedProjects.length
        } imported CEQAnet record(s).`
      );
      setWarnings([]);
    } catch (err) {
      setWarnings([
        err instanceof Error ? err.message : 'Invalid JSON backup file.',
      ]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white border border-black flex flex-col max-h-[90vh]">
        <div className="bg-black text-white px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono-tabular uppercase tracking-widest text-neutral-400">
              CEQAnet Importer &amp; Local Persistence
            </div>
            <h2 className="text-sm font-semibold">
              Import CEQAnet CSV / GeoJSON or Backup Local Database
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border border-white/40 p-1 hover:bg-white hover:text-black cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Drag and Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void handleFiles(e.dataTransfer.files);
            }}
            className={`border border-dashed border-black p-6 text-center transition-colors ${
              dragging ? 'bg-neutral-200' : 'bg-neutral-50'
            }`}
          >
            <FileUp className="w-7 h-7 mx-auto mb-2 text-black" />
            <div className="font-semibold text-sm">
              Drop `ceqanet.lci.ca.gov` CSV or GeoJSON files here
            </div>
            <p className="text-[11px] text-neutral-600 mt-1 max-w-lg mx-auto">
              Maps <code className="font-mono-tabular">SCH Number</code>,{' '}
              <code className="font-mono-tabular">Project Title</code>,{' '}
              <code className="font-mono-tabular">Lead Agency</code>,{' '}
              <code className="font-mono-tabular">County</code>,{' '}
              <code className="font-mono-tabular">Document Type</code>,{' '}
              <code className="font-mono-tabular">Exempt Status</code>,{' '}
              <code className="font-mono-tabular">Description</code>, and{' '}
              <code className="font-mono-tabular">Latitude/Longitude</code> (with
              automatic City/County centroid fallback).
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.geojson,.json"
                multiple
                onChange={(e) => void handleFiles(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="border border-black bg-black text-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider cursor-pointer hover:bg-neutral-800"
              >
                Choose CSV / GeoJSON
              </button>

              <button
                type="button"
                onClick={handleLoadSample}
                className="inline-flex items-center gap-1.5 border border-black bg-white hover:bg-neutral-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Load Sample CEQAnet CSV</span>
              </button>
            </div>
          </div>

          {statusMessage && (
            <div className="border border-black bg-neutral-100 px-3 py-2 flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="border border-black bg-neutral-50 px-3 py-2 space-y-1 text-[11px]">
              {warnings.map((w, i) => (
                <div key={i}>• {w}</div>
              ))}
            </div>
          )}

          {/* Imported CEQAnet Inventory */}
          <div className="border border-black p-3 flex items-center justify-between">
            <div>
              <div className="font-semibold uppercase tracking-wider text-[11px]">
                Persisted CEQAnet / Custom Records
              </div>
              <div className="text-neutral-600 font-mono-tabular mt-0.5">
                {importedProjects.length} record(s) stored in IndexedDB /
                localStorage
              </div>
            </div>
            {importedProjects.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onClearImported();
                  setStatusMessage('Cleared imported CEQAnet records.');
                }}
                className="inline-flex items-center gap-1 border border-black bg-white hover:bg-black hover:text-white px-2.5 py-1 text-[11px] uppercase tracking-wider cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Imports</span>
              </button>
            )}
          </div>

          {/* Local JSON Backup & Restore */}
          <div className="border border-black p-3 space-y-2 bg-neutral-50">
            <div className="flex items-center gap-2 font-semibold uppercase tracking-wider text-[11px]">
              <DatabaseBackup className="w-4 h-4" />
              <span>Offline Field Backup &amp; Restore (.json)</span>
            </div>
            <p className="text-[11px] text-neutral-600">
              Export all outreach statuses, agency notes, contact overrides, and
              imported CEQAnet records to a portable JSON archive for off-grid
              machine transfer.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() =>
                  exportJsonBackup(
                    buildBackupPayload(crmRecords, importedProjects)
                  )
                }
                className="border border-black bg-white hover:bg-neutral-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider cursor-pointer"
              >
                Export Backup (.json)
              </button>

              <input
                ref={backupInputRef}
                type="file"
                accept=".json"
                onChange={(e) => void handleBackupRestore(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => backupInputRef.current?.click()}
                className="border border-black bg-white hover:bg-neutral-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider cursor-pointer"
              >
                Restore Backup (.json)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
