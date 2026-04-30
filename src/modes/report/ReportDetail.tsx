import type { ReportModel } from '../../report/buildReport'
import { ReportPreview } from '../../report/ReportPreview'

type Props = { model: ReportModel }

export function ReportDetail({ model }: Props) {
  return <ReportPreview model={model} />
}
