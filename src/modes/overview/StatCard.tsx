import type { CSSProperties, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

type Props = {
  label: string
  icon: LucideIcon
  iconBackground?: string
  primary: ReactNode
  secondary?: ReactNode
  progress?: { value: number; max: number }
}

export function StatCard({ label, icon: Icon, iconBackground, primary, secondary, progress }: Props) {
  const ratio = progress && progress.max > 0 ? Math.min(1, progress.value / progress.max) : 0
  const barStyle: CSSProperties = { width: `${ratio * 100}%` }
  return (
    <article className="overview-stat-card">
      <header className="overview-stat-card-head">
        <span className="overview-stat-icon" style={iconBackground ? { background: iconBackground } : undefined}>
          <Icon size={18} aria-hidden="true" />
        </span>
        <span className="overview-stat-label">{label}</span>
      </header>
      <div className="overview-stat-primary">{primary}</div>
      {secondary && <div className="overview-stat-secondary">{secondary}</div>}
      {progress && (
        <div className="overview-stat-progress" aria-hidden="true">
          <span style={barStyle} />
        </div>
      )}
    </article>
  )
}
