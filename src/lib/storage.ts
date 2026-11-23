import { get, set } from 'idb-keyval';
import type { CrmRecord, PersistedBackup, SpatialProject } from '../types';

const CRM_KEY = 'regen_twin_m1_crm_v1';
const IMPORTED_KEY = 'regen_twin_m1_imported_v1';
const CALVTP_CACHE_KEY = 'regen_twin_m1_calvtp_raw_v1';

async function readStore<T>(key: string, fallback: T): Promise<T> {
  try {
    const val = await get<T>(key);
    if (val !== undefined) return val;
  } catch {
    // fallback to localStorage
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // ignore
  }
  return fallback;
}

async function writeStore<T>(key: string, value: T): Promise<void> {
  try {
    await set(key, value);
  } catch {
    // ignore IndexedDB quota/privacy error
  }
  try {
    const serialized = JSON.stringify(value);
    if (serialized.length < 4_500_000) {
      window.localStorage.setItem(key, serialized);
    }
  } catch {
    // localStorage quota exceeded for very large caches; IndexedDB still holds it
  }
}

export async function loadCrmRecords(): Promise<Record<string, CrmRecord>> {
  return readStore<Record<string, CrmRecord>>(CRM_KEY, {});
}

export async function saveCrmRecords(
  records: Record<string, CrmRecord>
): Promise<void> {
  await writeStore(CRM_KEY, records);
}

export async function loadImportedProjects(): Promise<SpatialProject[]> {
  return readStore<SpatialProject[]>(IMPORTED_KEY, []);
}

export async function saveImportedProjects(
  projects: SpatialProject[]
): Promise<void> {
  await writeStore(IMPORTED_KEY, projects);
}

export async function loadCachedCalvtpRaw<T>(): Promise<T | null> {
  return readStore<T | null>(CALVTP_CACHE_KEY, null);
}

export async function saveCachedCalvtpRaw<T>(raw: T): Promise<void> {
  try {
    await set(CALVTP_CACHE_KEY, raw);
  } catch {
    // ignore
  }
}

export function buildBackupPayload(
  crmRecords: Record<string, CrmRecord>,
  importedProjects: SpatialProject[]
): PersistedBackup {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    crmRecords,
    importedProjects,
  };
}

export function parseBackupPayload(jsonText: string): PersistedBackup {
  const parsed = JSON.parse(jsonText) as Partial<PersistedBackup>;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid JSON backup file.');
  }
  return {
    version: parsed.version ?? 1,
    exportedAt: parsed.exportedAt ?? new Date().toISOString(),
    crmRecords: parsed.crmRecords ?? {},
    importedProjects: Array.isArray(parsed.importedProjects)
      ? parsed.importedProjects
      : [],
  };
}
