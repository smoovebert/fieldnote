// Right rail content for Overview mode. Project-scoped settings only —
// AI assist + account live in the profile menu (top right) so they
// aren't duplicated here.

import { Settings as SettingsIcon } from 'lucide-react'

type Props = {
  lineNumberingMode: 'paragraph' | 'fixed-width'
  lineNumberingWidth: number
  onOpenProjectSettings: () => void
}

export function OverviewInspector(props: Props) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <SettingsIcon size={18} aria-hidden="true" />
        <h2>Project settings</h2>
      </div>
      <dl className="properties-list compact-properties">
        <div>
          <dt>Reader line numbering</dt>
          <dd>
            {props.lineNumberingMode === 'fixed-width'
              ? `Fixed width, ${props.lineNumberingWidth} chars per line`
              : 'One per paragraph'}
          </dd>
        </div>
      </dl>
      <button type="button" className="secondary-button" onClick={props.onOpenProjectSettings}>
        Edit project settings
      </button>
    </section>
  )
}
