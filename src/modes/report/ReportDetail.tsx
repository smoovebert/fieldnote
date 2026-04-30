import type { ReportModel } from '../../report/buildReport'
import { ReportPreview } from '../../report/ReportPreview'

type Props = { model: ReportModel }

export function ReportDetail({ model }: Props) {
  return (
    <article className="document-panel">
      <div className="report-scroll">
        <ReportPreview model={model} />
      </div>
    </article>
  )
}
