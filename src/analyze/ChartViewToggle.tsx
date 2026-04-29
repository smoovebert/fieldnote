import type { ReactNode } from 'react'

export type ChartViewToggleOption<T extends string> = {
  value: T
  label: string
  icon?: ReactNode
}

type Props<T extends string> = {
  value: T
  options: ChartViewToggleOption<T>[]
  onChange: (next: T) => void
  ariaLabel: string
}

export function ChartViewToggle<T extends string>({ value, options, onChange, ariaLabel }: Props<T>) {
  return (
    <div className="chart-view-toggle" role="tablist" aria-label={ariaLabel}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          className={value === opt.value ? 'active' : ''}
          onClick={() => onChange(opt.value)}
        >
          {opt.icon ? <span className="chart-view-toggle-icon">{opt.icon}</span> : null}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  )
}
