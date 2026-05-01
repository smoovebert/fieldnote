import { Database } from 'lucide-react'

type Props = {
  projectTitle: string
  sourceCount: number
  codeCount: number
  excerptCount: number
  caseCount: number
  attributeCount: number
}

export function ReportInspector(props: Props) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <Database size={18} aria-hidden="true" />
        <h2>Export Summary</h2>
      </div>
      <dl className="properties-list">
        <div>
          <dt>Project</dt>
          <dd>{props.projectTitle}</dd>
        </div>
        <div>
          <dt>Sources</dt>
          <dd>{props.sourceCount}</dd>
        </div>
        <div>
          <dt>Codes</dt>
          <dd>{props.codeCount}</dd>
        </div>
        <div>
          <dt>References</dt>
          <dd>{props.excerptCount}</dd>
        </div>
        <div>
          <dt>Cases</dt>
          <dd>{props.caseCount}</dd>
        </div>
        <div>
          <dt>Attributes</dt>
          <dd>{props.attributeCount}</dd>
        </div>
      </dl>
    </section>
  )
}
