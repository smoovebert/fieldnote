// React hook owning autosave debounce + in-flight guard + run-once-pending logic.
// Calls saveProject from io.ts. Dormant until Task 4 — App.tsx still uses its
// inline autosave effect.

import { useEffect, useRef } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { saveProject, type SavePayload } from './io'

type UseAutosaveOptions = {
  // enabled should be false until the initial remote load completes — passing
  // true before hasLoadedRemoteProject is set would overwrite remote state with
  // default state. Callers should gate with: !!session?.user && !!projectId &&
  // hasLoadedRemoteProject.current
  enabled: boolean
  projectId: string | null
  payload: SavePayload | null
  supabase: SupabaseClient
  setSaveStatus: (status: string) => void
  onSaved?: (payload: SavePayload) => void
}

export function useAutosave({
  enabled,
  projectId,
  payload,
  supabase,
  setSaveStatus,
  onSaved,
}: UseAutosaveOptions): void {
  const saveInFlightRef = useRef(false)
  const savePendingRef = useRef<(() => Promise<void>) | null>(null)
  // Tracks whether there are buffered changes that haven't been written yet.
  // Set when a save is debounce-scheduled; cleared when the save completes
  // successfully (or fails, since beforeunload should let the user retry rather
  // than block them indefinitely on a dead network).
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
    const timeout = window.setTimeout(() => {
      const runSave = async () => {
        try {
          await saveProject(projectId, payload, supabase)
          dirtyRef.current = false
          setSaveStatusRef.current('Saved to Supabase.')
          onSavedRef.current?.(payload)
        } catch (error) {
          dirtyRef.current = false
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
  }, [enabled, projectId, payload, supabase])
}
