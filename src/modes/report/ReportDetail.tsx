import type { ReportModel } from '../../report/buildReport'
import { ReportPreview } from '../../report/ReportPreview'
import { ScrollAffordance } from '../../components/ScrollAffordance'

type Props = { model: ReportModel }

export function ReportDetail({ model }: Props) {
  return (
    <article className="document-panel">
      <div className="report-scroll">
        <ReportPreview model={model} />
        <ScrollAffordance />
      </div>
    </article>
  )
}
