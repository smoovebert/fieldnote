// Local recovery snapshot — stored in IndexedDB so it survives across
// tabs, refreshes, and most crashes. Snapshots the current project
// every N seconds while autosave is healthy; if Supabase is unreachable
// or the tab dies between saves, the snapshot is the recovery copy.
//
// One snapshot per (user_id, project_id). New writes overwrite — we
// don't keep a history (that's what versioned snapshots will do later).

import type { ProjectData, ProjectRow } from './types'

const DB_NAME = 'fieldnote-recovery'
const DB_VERSION = 1
const STORE = 'project_snapshots'

export type RecoverySnapshot = {
  key: string // `${userId}::${projectId}`
  userId: string
  projectId: string
  projectTitle: string
  description: string
  capturedAt: string // ISO timestamp from the client clock
  remoteUpdatedAt: string | null // last seen Supabase updated_at
  data: ProjectData
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' })
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

export async function writeRecoverySnapshot(input: {
  userId: string
  projectRow: ProjectRow
  data: ProjectData
}): Promise<void> {
  const db = await openDb()
  const snap: RecoverySnapshot = {
    key: snapshotKey(input.userId, input.projectRow.id),
    userId: input.userId,
    projectId: input.projectRow.id,
    projectTitle: input.projectRow.title || 'Untitled project',
    description: input.data.description ?? '',
    capturedAt: new Date().toISOString(),
    remoteUpdatedAt: input.projectRow.updated_at ?? null,
    data: input.data,
  }
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(snap)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Could not write recovery snapshot'))
  })
}

export async function readRecoverySnapshot(userId: string, projectId: string): Promise<RecoverySnapshot | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(snapshotKey(userId, projectId))
    req.onsuccess = () => resolve((req.result as RecoverySnapshot | undefined) ?? null)
    req.onerror = () => reject(req.error ?? new Error('Could not read recovery snapshot'))
  })
}

export async function deleteRecoverySnapshot(userId: string, projectId: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(snapshotKey(userId, projectId))
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Could not delete recovery snapshot'))
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
