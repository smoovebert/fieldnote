// Header profile menu — replaces the bare sign-out icon with a popover
// that surfaces the signed-in user's email plus their per-account
// actions (AI assist settings, delete account, sign out). Per-project
// settings (line-numbering, etc.) stay in the Overview right rail
// because they're per-project, not per-user.

import { useEffect, useRef, useState } from 'react'
import { LogOut, Sparkles, Trash2, User } from 'lucide-react'

type Props = {
  accountEmail: string
  onOpenAiSettings: () => void
  onOpenAccountDelete: () => void
  onSignOut: () => void
}

export function ProfileMenu({ accountEmail, onOpenAiSettings, onOpenAccountDelete, onSignOut }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click and on Escape so the menu behaves like any
  // other popover (the Esc handler also restores focus to the trigger
  // implicitly via the click outside, no manual focus restore here).
  useEffect(() => {
    if (!open) return
    function onPointer(event: MouseEvent | TouchEvent) {
      if (!containerRef.current) return
      if (containerRef.current.contains(event.target as Node)) return
      setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Single helper so menu items consistently close before firing
  // their action — avoids the menu staying open behind the modal
  // a second-level action opens.
  function trigger(fn: () => void) {
    setOpen(false)
    fn()
  }

  return (
    <div className="profile-menu" ref={containerRef}>
      <button
        type="button"
        className="profile-menu-trigger header-icon-button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        title={accountEmail}
      >
        <User size={16} aria-hidden="true" />
      </button>
      {open && (
        <div className="profile-menu-popover" role="menu">
          <div className="profile-menu-header">
            <div className="profile-menu-eyebrow">Signed in as</div>
            <div className="profile-menu-email" title={accountEmail}>{accountEmail}</div>
          </div>
          <div className="profile-menu-divider" />
          <button
            type="button"
            role="menuitem"
            className="profile-menu-item"
            onClick={() => trigger(onOpenAiSettings)}
          >
            <Sparkles size={14} aria-hidden="true" />
            AI assist settings
          </button>
          <div className="profile-menu-divider" />
          <button
            type="button"
            role="menuitem"
            className="profile-menu-item profile-menu-item--destructive"
            onClick={() => trigger(onOpenAccountDelete)}
          >
            <Trash2 size={14} aria-hidden="true" />
            Delete account…
          </button>
          <button
            type="button"
            role="menuitem"
            className="profile-menu-item"
            onClick={() => trigger(onSignOut)}
          >
            <LogOut size={14} aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
