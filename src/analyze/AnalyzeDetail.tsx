import type { Dispatch, MouseEvent, SetStateAction } from 'react'
import { BookOpenText, Grid3x3, ListTree, Plus, Rows3, Search } from 'lucide-react'
import { CooccurrenceView } from './CooccurrenceView'
import { CrosstabsView } from './CrosstabsView'
import { MatrixView } from './MatrixView'
import { WordFreqView } from './WordFreqView'
import type { AnalyzePanel, AnalyzeViewState } from './analyzeViewState'
import type { CrosstabResult } from './crosstabs'
import type {
  CooccurrencePair,
  MatrixCellInput,
  MatrixColumn,
  MatrixColumnMode,
  WordFrequencyRow,
} from './derivedResults'
import type { AttributeFilter } from './queryDefinition'
import { ModeOrientation } from '../components/ModeOrientation'
import { ScrollAffordance } from '../components/ScrollAffordance'
import { formatExcerptCitation } from '../lib/excerptCitation'
import type { Attribute, Case, Code, Excerpt, SavedQuery } from '../lib/types'

type Props = {
  analyzePanel: AnalyzePanel
  setAnalyzePanel: (panel: AnalyzePanel) => void
  analyzePanelCount: string
  queryText: string
  setQueryText: (value: string) => void
  queryCodeId: string
  setQueryCodeId: (value: string) => void
  sortedCodes: Array<Code & { depth: number }>
  queryAdditionalCodeIds: string[]
  setQueryAdditionalCodeIds: Dispatch<SetStateAction<string[]>>
  codes: Code[]
  queryCaseId: string
  setQueryCaseId: (value: string) => void
  cases: Case[]
  queryAttributes: AttributeFilter[]
  setQueryAttributes: Dispatch<SetStateAction<AttributeFilter[]>>
  attributes: Attribute[]
  valuesForAttribute: (attributeId: string) => string[]
  clearQueryFilters: () => void
  queryName: string
  setQueryName: (value: string) => void
  saveCurrentQuery: () => void
  activeSavedQuery: SavedQuery | undefined
  captureQuerySnapshot: () => Promise<void>
  analyzeResults: Excerpt[]
  updateExcerptNote: (excerptId: string, note: string) => void
  selectActiveSource: (sourceId: string) => void
  matrixColumnMode: MatrixColumnMode
  setMatrixColumnMode: (mode: MatrixColumnMode) => void
  activeMatrixAttribute: Attribute | undefined
  setMatrixAttributeId: (attributeId: string) => void
  matrixRows: Code[]
  matrixColumns: MatrixColumn[]
  matrixCellInputs: MatrixCellInput[]
  analyzeView: AnalyzeViewState
  setAnalyzeView: Dispatch<SetStateAction<AnalyzeViewState>>
  handleMatrixCellSelect: (rowId: string, colId: string) => void
  exportMatrixCsv: (event: MouseEvent<HTMLButtonElement>) => void
  wordFrequencyViewRows: WordFrequencyRow[]
  handleWordSelect: (word: string) => void
  exportWordFrequencyCsv: (event: MouseEvent<HTMLButtonElement>) => void
  cooccurrencePairs: CooccurrencePair[]
  handlePairSelect: (codeAId: string, codeBId?: string) => void
  exportCoOccurrenceCsv: (event: MouseEvent<HTMLButtonElement>) => void
  crosstabResult: CrosstabResult | null
  handleCrosstabCellSelect: (codeId: string, attr1Value: string, attr2Value: string) => void
  exportCrosstabCsv: () => void
}

export function AnalyzeDetail({
  analyzePanel,
  setAnalyzePanel,
  analyzePanelCount,
  queryText,
  setQueryText,
  queryCodeId,
  setQueryCodeId,
  sortedCodes,
  queryAdditionalCodeIds,
  setQueryAdditionalCodeIds,
  codes,
  queryCaseId,
  setQueryCaseId,
  cases,
  queryAttributes,
  setQueryAttributes,
  attributes,
  valuesForAttribute,
  clearQueryFilters,
  queryName,
  setQueryName,
  saveCurrentQuery,
  activeSavedQuery,
  captureQuerySnapshot,
  analyzeResults,
  updateExcerptNote,
  selectActiveSource,
  matrixColumnMode,
  setMatrixColumnMode,
  activeMatrixAttribute,
  setMatrixAttributeId,
  matrixRows,
  matrixColumns,
  matrixCellInputs,
  analyzeView,
  setAnalyzeView,
  handleMatrixCellSelect,
  exportMatrixCsv,
  wordFrequencyViewRows,
  handleWordSelect,
  exportWordFrequencyCsv,
  cooccurrencePairs,
  handlePairSelect,
  exportCoOccurrenceCsv,
  crosstabResult,
  handleCrosstabCellSelect,
  exportCrosstabCsv,
}: Props) {
  const caseBySourceId = new Map<string, Case>()
  cases.forEach((item) => {
    item.sourceIds.forEach((sourceId) => caseBySourceId.set(sourceId, item))
  })

  return (
    <article className="detail-card analyze-surface">
      <div className="analyze-tabbar">
        <div className="analyze-tabs" role="tablist" aria-label="Analyze views">
          <button className={analyzePanel === 'query' ? 'active' : ''} type="button" onClick={() => setAnalyzePanel('query')}>
            <Search size={15} aria-hidden="true" />
            Query results
          </button>
          <button className={analyzePanel === 'matrix' ? 'active' : ''} type="button" onClick={() => setAnalyzePanel('matrix')}>
            <Rows3 size={15} aria-hidden="true" />
            Matrix coding
          </button>
          <button className={analyzePanel === 'frequency' ? 'active' : ''} type="button" onClick={() => setAnalyzePanel('frequency')}>
            <BookOpenText size={15} aria-hidden="true" />
            Word frequency
          </button>
          <button className={analyzePanel === 'cooccurrence' ? 'active' : ''} type="button" onClick={() => setAnalyzePanel('cooccurrence')}>
            <ListTree size={15} aria-hidden="true" />
            Co-occurrence
          </button>
          <button className={analyzePanel === 'crosstab' ? 'active' : ''} type="button" onClick={() => setAnalyzePanel('crosstab')}>
            <Grid3x3 size={15} aria-hidden="true" />
            Crosstabs
          </button>
        </div>
        <span className="reference-count">{analyzePanelCount}</span>
      </div>

      <ModeOrientation
        dismissKey="analyze"
        kicker="Analysis pass"
        title="Ask structured questions of the coded evidence"
        body="Use the filters to narrow the slice of data, then switch views depending on the kind of question. Send useful results to Report so they become part of the audit trail."
        points={[
          { label: 'Find excerpts', detail: 'Retrieve the exact coded passages behind a theme.' },
          { label: 'Compare groups', detail: 'Use matrix and crosstabs to compare codes by cases or attributes.' },
          { label: 'Trace patterns', detail: 'Use word frequency and co-occurrence to spot language and theme relationships.' },
        ]}
      />

      <div className="query-builder">
        <label className="property-field query-field-text">
          <span>Text</span>
          <input value={queryText} placeholder="Search excerpt text, notes, sources, cases" onChange={(event) => setQueryText(event.target.value)} />
        </label>
        <label className="property-field query-field-code">
          <span>Code</span>
          <select value={queryCodeId} onChange={(event) => setQueryCodeId(event.target.value)}>
            <option value="">Any code</option>
            {sortedCodes.map((code) => (
              <option key={code.id} value={code.id}>
                {'-'.repeat(code.depth)} {code.name}
              </option>
            ))}
          </select>
        </label>
        <div className="property-field also-coded-with query-field-also">
          <span>Also coded with</span>
          <div className="also-coded-with-chips">
            {queryAdditionalCodeIds.length === 0 && (
              <small className="also-coded-with-empty">None — add codes to require excerpts coded with all of them.</small>
            )}
            {queryAdditionalCodeIds.map((id) => {
              const code = codes.find((c) => c.id === id)
              return (
                <span key={id} className="also-coded-with-chip">
                  {code?.name ?? 'Unknown code'}
                  <button
                    type="button"
                    aria-label={`Remove ${code?.name ?? 'code'} from filter`}
                    onClick={() => setQueryAdditionalCodeIds((current) => current.filter((c) => c !== id))}
                  >×</button>
                </span>
              )
            })}
          </div>
          <select
            value=""
            onChange={(event) => {
              const next = event.target.value
              if (!next) return
              setQueryAdditionalCodeIds((current) => current.includes(next) || next === queryCodeId ? current : [...current, next])
            }}
          >
            <option value="">+ Add code (AND)</option>
            {sortedCodes
              .filter((c) => c.id !== queryCodeId && !queryAdditionalCodeIds.includes(c.id))
              .map((code) => (
                <option key={code.id} value={code.id}>{'-'.repeat(code.depth)} {code.name}</option>
              ))}
          </select>
        </div>
        <label className="property-field query-field-case">
          <span>Case</span>
          <select value={queryCaseId} onChange={(event) => setQueryCaseId(event.target.value)}>
            <option value="">Any case</option>
            {cases.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <div className="property-field property-field-stack query-field-attributes">
          <span>Attributes</span>
          <div className="attribute-filter-control-row">
            <div className="attribute-filter-list">
              {queryAttributes.length === 0 && (
                <div className="attribute-filter-empty">No attribute filters.</div>
              )}
              {queryAttributes.map((row, index) => {
                const usedElsewhere = new Set(
                  queryAttributes.filter((_, i) => i !== index).map((r) => r.attributeId).filter(Boolean),
                )
                const valueOptions = valuesForAttribute(row.attributeId)
                return (
                  <div key={index} className="attribute-filter-row">
                    <select
                      value={row.attributeId}
                      onChange={(event) => {
                        const nextId = event.target.value
                        setQueryAttributes((current) =>
                          current.map((r, i) => (i === index ? { attributeId: nextId, value: '' } : r)),
                        )
                      }}
                    >
                      <option value="">— pick attribute —</option>
                      {attributes
                        .filter((a) => a.id === row.attributeId || !usedElsewhere.has(a.id))
                        .map((a) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                    </select>
                    <select
                      value={row.value}
                      disabled={!row.attributeId}
                      onChange={(event) => {
                        const nextValue = event.target.value
                        setQueryAttributes((current) =>
                          current.map((r, i) => (i === index ? { ...r, value: nextValue } : r)),
                        )
                      }}
                    >
                      <option value="">— pick value —</option>
                      {valueOptions.map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="attribute-filter-delete"
                      aria-label="Remove this attribute filter"
                      onClick={() => {
                        setQueryAttributes((current) => current.filter((_, i) => i !== index))
                      }}
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
            <button
              className="secondary-button query-clear"
              type="button"
              onClick={clearQueryFilters}
            >
              Clear filters
            </button>
          </div>
          <button
            type="button"
            className="secondary-button attribute-filter-add"
            disabled={queryAttributes.length >= attributes.length}
            onClick={() => {
              setQueryAttributes((current) => [...current, { attributeId: '', value: '' }])
            }}
          >
            + Add attribute filter
          </button>
        </div>
      </div>

      <div className="query-save-row">
        <label className="property-field">
          <span>Saved query name</span>
          <input value={queryName} placeholder="Name this analytic question" onChange={(event) => setQueryName(event.target.value)} />
        </label>
        <button className="secondary-button" type="button" onClick={saveCurrentQuery}>
          <Plus size={16} aria-hidden="true" />
          {activeSavedQuery ? 'Update query' : 'Save query'}
        </button>
        {activeSavedQuery && analyzePanel === 'query' && (
          <button
            className="secondary-button"
            type="button"
            onClick={() => void captureQuerySnapshot()}
            title="Pin the current results as a point-in-time snapshot"
          >
            Pin result
          </button>
        )}
      </div>

      {analyzePanel === 'query' && (
        <div className="query-results-table" role="table" aria-label="Analyze query results">
          <div className="query-result-row query-result-head" role="row">
            <span>Source</span>
            <span>Case</span>
            <span>Codes</span>
            <span>Excerpt</span>
            <span>Note</span>
          </div>
          {analyzeResults.map((excerpt) => {
            const linkedCase = caseBySourceId.get(excerpt.sourceId)
            const excerptCodes = codes.filter((code) => excerpt.codeIds.includes(code.id))

            return (
              <div key={excerpt.id} className="query-result-row" role="row">
                <button type="button" onClick={() => selectActiveSource(excerpt.sourceId)}>
                  {formatExcerptCitation(excerpt)}
                </button>
                <span>{linkedCase?.name ?? '-'}</span>
                <span>{excerptCodes.map((code) => code.name).join(', ')}</span>
                <p>{excerpt.text}</p>
                <input value={excerpt.note} placeholder="Add note" onChange={(event) => updateExcerptNote(excerpt.id, event.target.value)} />
              </div>
            )
          })}
          {!analyzeResults.length && (
            <div className="empty-table-state">
              <strong>No matching excerpts</strong>
              <span>Broaden the filters, choose a different code or case, or code more passages first.</span>
            </div>
          )}
        </div>
      )}

      {analyzePanel === 'matrix' && (
        <>
          <div className="matrix-toolbar">
            <label className="property-field">
              <span>Columns</span>
              <select value={matrixColumnMode} onChange={(event) => setMatrixColumnMode(event.target.value as MatrixColumnMode)}>
                <option value="case">Cases</option>
                <option value="attribute">Attribute values</option>
              </select>
            </label>
            {matrixColumnMode === 'attribute' && (
              <label className="property-field">
                <span>Attribute</span>
                <select
                  value={activeMatrixAttribute?.id ?? ''}
                  onChange={(event) => setMatrixAttributeId(event.target.value)}
                >
                  {attributes.map((attribute) => (
                    <option key={attribute.id} value={attribute.id}>
                      {attribute.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <MatrixView
            rowLabels={matrixRows.map((code) => code.name)}
            colLabels={matrixColumns.map((column) => column.label)}
            cells={matrixCellInputs}
            view={analyzeView.matrix.view}
            topNRows={analyzeView.matrix.topNRows}
            topNCols={analyzeView.matrix.topNCols}
            onViewChange={(next) => setAnalyzeView((s) => ({ ...s, matrix: { ...s.matrix, view: next } }))}
            onTopNRowsChange={(next) => setAnalyzeView((s) => ({ ...s, matrix: { ...s.matrix, topNRows: next } }))}
            onTopNColsChange={(next) => setAnalyzeView((s) => ({ ...s, matrix: { ...s.matrix, topNCols: next } }))}
            onCellSelect={handleMatrixCellSelect}
            onExportCsv={() => exportMatrixCsv({ preventDefault: () => {} } as MouseEvent<HTMLButtonElement>)}
            classifyEmptyMessage={
              cases.length === 0 && attributes.length === 0
                ? 'Matrix needs cases or attribute values — go to Classify mode.'
                : undefined
            }
          />
        </>
      )}

      {analyzePanel === 'frequency' && (
        <WordFreqView
          rows={wordFrequencyViewRows}
          totalExcerpts={analyzeResults.length}
          view={analyzeView.wordFreq.view}
          topN={analyzeView.wordFreq.topN}
          onViewChange={(next) => setAnalyzeView((s) => ({ ...s, wordFreq: { ...s.wordFreq, view: next } }))}
          onTopNChange={(next) => setAnalyzeView((s) => ({ ...s, wordFreq: { ...s.wordFreq, topN: next } }))}
          onWordSelect={handleWordSelect}
          onExportCsv={() => exportWordFrequencyCsv({ preventDefault: () => {} } as MouseEvent<HTMLButtonElement>)}
        />
      )}

      {analyzePanel === 'cooccurrence' && (
        <CooccurrenceView
          pairs={cooccurrencePairs}
          view={analyzeView.cooccur.view}
          topN={analyzeView.cooccur.topN}
          onViewChange={(next) => setAnalyzeView((s) => ({ ...s, cooccur: { ...s.cooccur, view: next } }))}
          onTopNChange={(next) => setAnalyzeView((s) => ({ ...s, cooccur: { ...s.cooccur, topN: next } }))}
          onPairSelect={handlePairSelect}
          onCodeSelect={handlePairSelect}
          onExportCsv={() => exportCoOccurrenceCsv({ preventDefault: () => {} } as MouseEvent<HTMLButtonElement>)}
        />
      )}
      {analyzePanel === 'crosstab' && (
        <div className="analyze-panel">
          <CrosstabsView
            attributes={attributes.map((a) => ({ id: a.id, name: a.name }))}
            attr1Id={analyzeView.crosstab.attr1Id}
            attr2Id={analyzeView.crosstab.attr2Id}
            percentMode={analyzeView.crosstab.percentMode}
            topNRows={analyzeView.crosstab.topNRows}
            topNCols={analyzeView.crosstab.topNCols}
            result={crosstabResult}
            onAttr1Change={(next) => setAnalyzeView((s) => ({ ...s, crosstab: { ...s.crosstab, attr1Id: next } }))}
            onAttr2Change={(next) => setAnalyzeView((s) => ({ ...s, crosstab: { ...s.crosstab, attr2Id: next } }))}
            onPercentModeChange={(next) => setAnalyzeView((s) => ({ ...s, crosstab: { ...s.crosstab, percentMode: next } }))}
            onTopNRowsChange={(next) => setAnalyzeView((s) => ({ ...s, crosstab: { ...s.crosstab, topNRows: next } }))}
            onTopNColsChange={(next) => setAnalyzeView((s) => ({ ...s, crosstab: { ...s.crosstab, topNCols: next } }))}
            onCellSelect={handleCrosstabCellSelect}
            onExportCsv={exportCrosstabCsv}
          />
        </div>
      )}
      <ScrollAffordance />
    </article>
  )
}
