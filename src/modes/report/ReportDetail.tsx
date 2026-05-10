import type { ReportModel } from '../../report/buildReport'
import { ReportPreview } from '../../report/ReportPreview'
import { ScrollAffordance } from '../../components/ScrollAffordance'
import { ModeOrientation } from '../../components/ModeOrientation'

type Props = { model: ReportModel }

export function ReportDetail({ model }: Props) {
  return (
    <article className="document-panel report-document-panel">
      <ModeOrientation
        kicker="Output pass"
        title="Assemble a readable audit trail"
        body="Report turns the project into something shareable: project memo, codebook, excerpts, cases, source memos, and pinned analysis snapshots."
        points={[
          { label: 'Readable report', detail: 'Use Word or PDF when someone needs to read the analysis.' },
          { label: 'Raw data', detail: 'Use CSV or Excel when someone needs tables for follow-up work.' },
          { label: 'Snapshots', detail: 'Send results from Analyze to preserve point-in-time findings.' },
        ]}
      />
      <div className="report-scroll">
        <ReportPreview model={model} />
        <ScrollAffordance />
      </div>
    </article>
  )
}
