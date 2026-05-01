import type { ReportModel } from './buildReport'
import './ReportPreview.css'

type Props = { model: ReportModel }

export function ReportPreview({ model }: Props) {
  return (
    <article className="report-preview">
      <header className="report-cover">
        <p className="report-eyebrow">Research report</p>
        <h1 className="report-title">{model.cover.title}</h1>
        <p className="report-stats fn-meta">
          {model.cover.dateIso}
          {' · '}
          {model.cover.counts.sources} sources
          {' · '}
          {model.cover.counts.codes} codes
          {' · '}
          {model.cover.counts.references} coded references
          {' · '}
          {model.cover.counts.cases} cases
        </p>
      </header>

      {model.projectMemo && (
        <section className="report-section report-project-memo">
          <h2>Project memo</h2>
          <p>{model.projectMemo}</p>
        </section>
      )}

      {model.codebook.length > 0 && (
        <section className="report-section report-codebook">
          <h2>Codebook</h2>
          <ol className="report-codebook-list">
            {model.codebook.map((entry) => (
              <li key={entry.id} className={`report-code-row depth-${entry.depth}`}>
                <div className="report-code-row-head">
                  {entry.depth === 1 ? <span className="report-child-arrow" aria-hidden="true">→ </span> : null}
                  <strong className="report-code-name">{entry.name}</strong>
                  <span className="report-code-refs fn-mono">{entry.refCount} refs</span>
                </div>
                {entry.description ? <p className="report-code-desc">{entry.description}</p> : null}
              </li>
            ))}
          </ol>
        </section>
      )}

      {model.sampleExcerpts.length > 0 && (
        <section className="report-section report-samples">
          <h2>Sample excerpts</h2>
          {model.sampleExcerpts.map((entry) => (
            <div key={entry.code.id} className="report-sample-block">
              <h3 className="report-sample-code">{entry.code.name}</h3>
              {entry.codeMemo ? <p className="report-sample-memo">{entry.codeMemo}</p> : null}
              {entry.samples.map((sample) => (
                <blockquote key={sample.excerptId} className="report-sample-quote">
                  <p className="report-sample-text">{sample.text}</p>
                  <cite className="fn-meta">
                    {sample.sourceTitle}
                    {sample.note ? ` — ${sample.note}` : ''}
                  </cite>
                </blockquote>
              ))}
            </div>
          ))}
        </section>
      )}

      {model.cases.length > 0 && (
        <section className="report-section report-cases">
          <h2>Cases</h2>
          {model.cases.map((c) => (
            <div key={c.id} className="report-case-block">
              <h3 className="report-case-name">{c.name}</h3>
              {c.description ? <p className="report-case-desc">{c.description}</p> : null}
              {c.attributes.length > 0 && (
                <dl className="report-case-attrs">
                  {c.attributes.map((a) => (
                    <div key={a.name} className="report-case-attr-row">
                      <dt>{a.name}</dt>
                      <dd>{a.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {c.sources.length > 0 && (
                <ul className="report-case-sources fn-meta">
                  {c.sources.map((s) => (
                    <li key={s.id}>{s.title}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {model.sourceMemos.length > 0 && (
        <section className="report-section report-source-memos">
          <h2>Source memos</h2>
          {model.sourceMemos.map((sm) => (
            <div key={sm.sourceId} className="report-source-memo-block">
              <h3 className="report-source-memo-title">{sm.sourceTitle}</h3>
              <p>{sm.body}</p>
            </div>
          ))}
        </section>
      )}

      {model.snapshotMemos.length > 0 && (
        <section className="report-section report-snapshot-memos">
          <h2>Analysis snapshots</h2>
          {model.snapshotMemos.map((sm) => (
            <div key={sm.snapshotId} className="report-snapshot-block">
              <h3 className="report-snapshot-title">{sm.queryName}{sm.label ? ` — ${sm.label}` : ''}</h3>
              <p className="report-snapshot-meta">
                Captured {new Date(sm.capturedAtIso).toLocaleString()} · {sm.excerptCount} excerpt{sm.excerptCount === 1 ? '' : 's'}
              </p>
              <p className="report-snapshot-note">{sm.note}</p>
              {sm.samples.length > 0 && (
                <ul className="report-snapshot-samples">
                  {sm.samples.map((sample, i) => (
                    <li key={i}>
                      <em>{sample.sourceTitle}:</em> &ldquo;{sample.text}&rdquo;
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}
    </article>
  )
}
