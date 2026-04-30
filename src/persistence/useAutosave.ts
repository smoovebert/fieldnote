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

  useEffect(() => {
    if (!enabled || !projectId || !payload) return

    setSaveStatusRef.current('Saving...')
    const timeout = window.setTimeout(() => {
      const runSave = async () => {
        try {
          await saveProject(projectId, payload, supabase)
          setSaveStatusRef.current('Saved to Supabase.')
          onSavedRef.current?.(payload)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Save failed.'
          setSaveStatusRef.current(message)
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
