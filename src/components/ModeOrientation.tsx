import { useState } from 'react'
import { X } from 'lucide-react'

type OrientationPoint = {
  label: string
  detail: string
}

type Props = {
  kicker: string
  title: string
  body: string
  points?: OrientationPoint[]
  // When set, the band renders a dismiss control and stays hidden once
  // dismissed. Dismissal is keyed by this value and persists across
  // sessions in localStorage, so each mode's band is remembered
  // independently. Omit to keep the band permanent (no close button).
  dismissKey?: string
}

const STORAGE_PREFIX = 'fieldnote.orientation-dismissed:'

function isDismissed(key: string | undefined): boolean {
  if (!key) return false
  try {
    return window.localStorage.getItem(`${STORAGE_PREFIX}${key}`) === '1'
  } catch {
    return false
  }
}

function persistDismissal(key: string | undefined) {
  if (!key) return
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${key}`, '1')
  } catch {
    // localStorage may be unavailable (private mode etc.) — fall back
    // to in-memory dismissal only.
  }
}

export function ModeOrientation({ kicker, title, body, points = [], dismissKey }: Props) {
  const [dismissed, setDismissed] = useState(() => isDismissed(dismissKey))

  if (dismissed) return null

  return (
    <section className="mode-orientation" aria-label={`${title} orientation`}>
      <div className="mode-orientation-copy">
        <p className="detail-kicker">{kicker}</p>
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
      {points.length > 0 && (
        <ul className="mode-orientation-points">
          {points.map((point) => (
            <li key={point.label}>
              <strong>{point.label}</strong>
              <span>{point.detail}</span>
            </li>
          ))}
        </ul>
      )}
      {dismissKey && (
        <button
          type="button"
          className="mode-orientation-dismiss"
          aria-label="Hide this guidance"
          title="Hide this guidance"
          onClick={() => {
            persistDismissal(dismissKey)
            setDismissed(true)
          }}
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </section>
  )
}
