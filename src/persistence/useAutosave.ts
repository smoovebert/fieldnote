// React hook owning autosave debounce + in-flight guard + run-once-pending logic.
// Calls saveProject from io.ts.
//
// Recovery layering:
//   1. As soon as a payload change is debounce-scheduled, write a LOCAL DRAFT
//      snapshot to IndexedDB (synced=false). This is the rescue copy if the
//      network drops between the debounce and the remote write.
//   2. After the remote save succeeds, mark the snapshot synced=true.
//   3. dirtyRef stays true until the remote save succeeds. On failure, the
//      beforeunload guard keeps warning so the user can't accidentally close
//      the tab on top of unsaved work.

import { useEffect, useRef } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { saveProject, type SavePayload } from './io'
import { markRecoverySnapshotSynced, writeRecoveryDraft } from '../lib/localRecovery'

type UseAutosaveOptions = {
  // enabled should be false until the initial remote load completes — passing
  // true before hasLoadedRemoteProject is set would overwrite remote state with
  // default state. Callers should gate with: !!session?.user && !!projectId &&
  // hasLoadedRemoteProject.current
  enabled: boolean
  projectId: string | null
  payload: SavePayload | null
  supabase: SupabaseClient
  /**
   * Authenticated user id. Used to key the local IndexedDB recovery snapshot.
   * If null, the local draft write is skipped (we don't know whose snapshot
   * this is).
   */
  userId: string | null
  /**
   * Latest known ProjectRow for this project. Used so the recovery snapshot
   * can record the project's current title and last-known remote
   * updated_at. May be null if the row hasn't loaded yet.
   */
  projectRow: { id: string; title: string; updated_at: string | null } | null
  setSaveStatus: (status: string) => void
  onSaved?: (payload: SavePayload) => void
}

export function useAutosave({
  enabled,
  projectId,
  payload,
  supabase,
  userId,
  projectRow,
  setSaveStatus,
  onSaved,
}: UseAutosaveOptions): void {
  const saveInFlightRef = useRef(false)
  const savePendingRef = useRef<(() => Promise<void>) | null>(null)
  // dirtyRef tracks whether the user has unsynced changes. ONLY cleared after
  // a successful remote save. If a save fails, dirty stays true so beforeunload
  // continues to warn — the latest edits are still in IDB but not in Supabase.
  const dirtyRef = useRef(false)

  // Stash the latest callbacks in refs so the effect deps array stays stable.
  // Without this, passing non-memoized setSaveStatus / onSaved would retrigger
  // the effect on every render and cause continuous saves.
  const setSaveStatusRef = useRef(setSaveStatus)
  const onSavedRef = useRef(onSaved)
  useEffect(() => {
    setSaveStatusRef.current = setSaveStatus
  })
  useEffect(() => {
    onSavedRef.current = onSaved
  })

  // beforeunload guard: warn the user if they try to close/refresh while there
  // are buffered or in-flight changes. Browsers ignore the custom message and
  // show their own "Leave site?" dialog, but returning a truthy string is the
  // documented signal to trigger that dialog.
  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (dirtyRef.current || saveInFlightRef.current || savePendingRef.current) {
        event.preventDefault()
        event.returnValue = '' // required for Chrome
        return ''
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  useEffect(() => {
    if (!enabled || !projectId || !payload) return

    dirtyRef.current = true
    setSaveStatusRef.current('Saving...')

    // Eager local draft: write the snapshot to IndexedDB BEFORE the network
    // attempt. If Supabase is unreachable for any reason, this is the rescue
    // copy. We don't await — the write is fast (small payload, single IDB tx)
    // and we don't want it to delay the actual remote save.
    if (userId && projectRow) {
      void writeRecoveryDraft({
        userId,
        projectRow: { id: projectRow.id, title: projectRow.title, updated_at: projectRow.updated_at },
        data: payload.projectData,
      }).catch((error) => {
        console.warn('Local draft snapshot failed:', error)
      })
    }

    const timeout = window.setTimeout(() => {
      const runSave = async () => {
        try {
          await saveProject(projectId, payload, supabase)
          dirtyRef.current = false
          setSaveStatusRef.current('Saved to Supabase.')
          if (userId) {
            void markRecoverySnapshotSynced(userId, projectId).catch((error) => {
              console.warn('Could not mark snapshot synced:', error)
            })
          }
          onSavedRef.current?.(payload)
        } catch (error) {
          // dirtyRef stays true — beforeunload should keep warning until the
          // user either succeeds at saving or chooses to leave.
          const message = error instanceof Error ? error.message : 'Save failed.'
          setSaveStatusRef.current(`Save failed: ${message}`)
        }
      }

      const runSaveCycle = async () => {
        savePendingRef.current = runSave
        if (saveInFlightRef.current) return
        saveInFlightRef.current = true
        try {
          while (savePendingRef.current) {
            const fn = savePendingRef.current
            savePendingRef.current = null
            await fn()
          }
        } finally {
          saveInFlightRef.current = false
        }
      }

      void runSaveCycle()
    }, 700)

    return () => window.clearTimeout(timeout)
  }, [enabled, projectId, payload, supabase, userId, projectRow])
}
