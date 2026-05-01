// Local recovery + versioned history — stored in IndexedDB so they
// survive across tabs, refreshes, and most crashes.
//
// Two stores in the same DB:
//
//   project_snapshots — one row per (user, project) holding the LATEST
//   state. Updated on every successful Supabase save. Used as the
//   restore-on-load rescue copy.
//
//   project_versions — daily history. One row per (user, project, date)
//   so a user can roll back to "yesterday" or "last week" without ever
//   leaving the browser. Capped at LAST_N_VERSIONS per project; older
//   rows are pruned automatically.

import type { ProjectData } from './types'

const DB_NAME = 'fieldnote-recovery'
const DB_VERSION = 2
const STORE_LATEST = 'project_snapshots'
const STORE_VERSIONS = 'project_versions'
const LAST_N_VERSIONS = 10

export type RecoverySnapshot = {
  key: string // `${userId}::${projectId}`
  userId: string
  projectId: string
  projectTitle: string
  description: string
  capturedAt: string // ISO timestamp from the client clock
  remoteUpdatedAt: string | null // last seen Supabase updated_at
  /**
   * True when this snapshot reflects state that has been confirmed in
   * Supabase. False when the snapshot is a pre-save draft — these
   * exist precisely so a network failure between debounce and write
   * doesn't lose the user's most recent edits.
   */
  synced: boolean
  data: ProjectData
}

export type ProjectVersion = {
  // Composite key: `${userId}::${projectId}::${dateUtc}`. Same project
  // + same UTC date = overwrites; different date = new row.
  key: string
  userId: string
  projectId: string
  projectTitle: string
  capturedAt: string // last write of the day
  dateUtc: string // YYYY-MM-DD
  data: ProjectData
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (event) => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_LATEST)) {
        db.createObjectStore(STORE_LATEST, { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains(STORE_VERSIONS) && (event.oldVersion ?? 0) < 2) {
        const store = db.createObjectStore(STORE_VERSIONS, { keyPath: 'key' })
        store.createIndex('byProject', ['userId', 'projectId'])
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('Could not open recovery DB'))
  })
  return dbPromise
}

function snapshotKey(userId: string, projectId: string) {
  return `${userId}::${projectId}`
}

function versionKey(userId: string, projectId: string, dateUtc: string) {
  return `${userId}::${projectId}::${dateUtc}`
}

function utcDate(now = new Date()) {
  return now.toISOString().slice(0, 10)
}

// The recovery store only needs id/title/updated_at from the project row;
// everything else is captured inside the ProjectData payload.
export type RecoveryProjectMeta = { id: string; title: string; updated_at: string | null }

/**
 * Write a draft snapshot — call this BEFORE attempting the remote
 * save so that if the network fails between the user's edit and
 * Supabase accepting the write, the latest state still survives in
 * IndexedDB. `synced` is set to false; call markRecoverySnapshotSynced
 * after the remote save succeeds.
 *
 * Daily versioned history is also written here (overwriting today's
 * version), so even unsynced drafts get rolled into the daily history.
 */
export async function writeRecoveryDraft(input: {
  userId: string
  projectRow: RecoveryProjectMeta
  data: ProjectData
}): Promise<void> {
  await writeSnapshotInternal(input, false)
}

/**
 * Mark the latest recovery snapshot for (userId, projectId) as synced.
 * Called from the autosave hook after Supabase confirms the write.
 */
export async function markRecoverySnapshotSynced(userId: string, projectId: string): Promise<void> {
  const db = await openDb()
  const key = snapshotKey(userId, projectId)
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_LATEST, 'readwrite')
    const store = tx.objectStore(STORE_LATEST)
    const getReq = store.get(key)
    getReq.onsuccess = () => {
      const existing = getReq.result as RecoverySnapshot | undefined
      if (!existing) {
        resolve()
        return
      }
      store.put({ ...existing, synced: true })
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Could not mark snapshot synced'))
  })
}

/**
 * Backwards-compatible alias for writeRecoveryDraft + immediate sync.
 * Used by code paths that already have confirmed-saved state.
 */
export async function writeRecoverySnapshot(input: {
  userId: string
  projectRow: RecoveryProjectMeta
  data: ProjectData
}): Promise<void> {
  await writeSnapshotInternal(input, true)
}

async function writeSnapshotInternal(input: {
  userId: string
  projectRow: RecoveryProjectMeta
  data: ProjectData
}, synced: boolean): Promise<void> {
  const db = await openDb()
  const now = new Date()
  const dateUtc = utcDate(now)
  const capturedAt = now.toISOString()

  const snap: RecoverySnapshot = {
    key: snapshotKey(input.userId, input.projectRow.id),
    userId: input.userId,
    projectId: input.projectRow.id,
    projectTitle: input.projectRow.title || 'Untitled project',
    description: input.data.description ?? '',
    capturedAt,
    remoteUpdatedAt: input.projectRow.updated_at ?? null,
    synced,
    data: input.data,
  }

  const version: ProjectVersion = {
    key: versionKey(input.userId, input.projectRow.id, dateUtc),
    userId: input.userId,
    projectId: input.projectRow.id,
    projectTitle: input.projectRow.title || 'Untitled project',
    capturedAt,
    dateUtc,
    data: input.data,
  }

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_LATEST, STORE_VERSIONS], 'readwrite')
    tx.objectStore(STORE_LATEST).put(snap)
    tx.objectStore(STORE_VERSIONS).put(version)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Could not write recovery snapshot'))
  })

  // Prune older versions beyond LAST_N_VERSIONS for this project.
  await pruneOldVersions(input.userId, input.projectRow.id)
}

async function pruneOldVersions(userId: string, projectId: string) {
  const versions = await listVersions(userId, projectId)
  if (versions.length <= LAST_N_VERSIONS) return
  const toDelete = versions.slice(LAST_N_VERSIONS).map((v) => v.key)
  if (toDelete.length === 0) return
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_VERSIONS, 'readwrite')
    const store = tx.objectStore(STORE_VERSIONS)
    for (const k of toDelete) store.delete(k)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Could not prune versions'))
  })
}

export async function readRecoverySnapshot(userId: string, projectId: string): Promise<RecoverySnapshot | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_LATEST, 'readonly')
    const req = tx.objectStore(STORE_LATEST).get(snapshotKey(userId, projectId))
    req.onsuccess = () => resolve((req.result as RecoverySnapshot | undefined) ?? null)
    req.onerror = () => reject(req.error ?? new Error('Could not read recovery snapshot'))
  })
}

export async function deleteRecoverySnapshot(userId: string, projectId: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_LATEST, 'readwrite')
    tx.objectStore(STORE_LATEST).delete(snapshotKey(userId, projectId))
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Could not delete recovery snapshot'))
  })
}

export async function listVersions(userId: string, projectId: string): Promise<ProjectVersion[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VERSIONS, 'readonly')
    const store = tx.objectStore(STORE_VERSIONS)
    const index = store.index('byProject')
    const range = IDBKeyRange.only([userId, projectId])
    const req = index.getAll(range)
    req.onsuccess = () => {
      const rows = (req.result as ProjectVersion[]) ?? []
      // newest first
      rows.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
      resolve(rows)
    }
    req.onerror = () => reject(req.error ?? new Error('Could not list versions'))
  })
}

export async function readVersion(key: string): Promise<ProjectVersion | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VERSIONS, 'readonly')
    const req = tx.objectStore(STORE_VERSIONS).get(key)
    req.onsuccess = () => resolve((req.result as ProjectVersion | undefined) ?? null)
    req.onerror = () => reject(req.error ?? new Error('Could not read version'))
  })
}

/**
 * Snapshot is "ahead of remote" if the local capturedAt is more than
 * STALE_THRESHOLD_MS newer than the remote updated_at we saw at load
 * time. The threshold avoids false positives from a snapshot written
 * the same second as the autosave round-tripped.
 */
const STALE_THRESHOLD_MS = 5_000

export function isLocalAheadOfRemote(snap: RecoverySnapshot, remoteUpdatedAt: string | null): boolean {
  if (!remoteUpdatedAt) return true // no remote timestamp → trust local
  const localMs = Date.parse(snap.capturedAt)
  const remoteMs = Date.parse(remoteUpdatedAt)
  if (Number.isNaN(localMs) || Number.isNaN(remoteMs)) return false
  return localMs - remoteMs > STALE_THRESHOLD_MS
}
