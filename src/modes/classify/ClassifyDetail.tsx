import { Plus, Trash2, UserPlus } from 'lucide-react'
import type { Attribute, AttributeValue, Case, Source } from '../../lib/types'

type Props = {
  cases: Case[]
  sources: Source[]
  activeSource: Source
  attributes: Attribute[]
  attributeValues: AttributeValue[]
  newAttributeName: string
  caseGridTemplate: string
  setNewAttributeName: (value: string) => void
  createCasesFromSources: () => void
  addAttribute: () => void
  selectActiveSource: (id: string) => void
  assignSourceToCase: (sourceId: string, caseId: string) => void
  updateCase: (caseId: string, patch: Partial<Case>) => void
  updateAttributeValue: (caseId: string, attributeId: string, value: string) => void
  deleteCase: (caseId: string) => void
}

export function ClassifyDetail(props: Props) {
  return (
    <article className="detail-card classify-surface">
      <div className="source-register-heading">
        <div>
          <p className="detail-kicker">Participants and attributes</p>
          <h2>Case sheet</h2>
        </div>
        <span className="reference-count">{props.cases.length} cases</span>
      </div>

      <div className="classify-toolbar">
        <button className="secondary-button" type="button" onClick={props.createCasesFromSources}>
          <UserPlus size={16} aria-hidden="true" />
          Create cases from sources
        </button>
        <label className="inline-entry">
          <input value={props.newAttributeName} placeholder="New attribute" onChange={(event) => props.setNewAttributeName(event.target.value)} />
          <button className="secondary-button" type="button" onClick={props.addAttribute}>
            <Plus size={16} aria-hidden="true" />
            Add
          </button>
        </label>
      </div>

      <div className="case-assignment-table" role="table" aria-label="Source case assignments">
        <div className="case-assignment-row case-row-head" role="row">
          <span>Source</span>
          <span>Assigned case</span>
        </div>
        {props.sources.map((source) => (
          <div key={source.id} className={source.id === props.activeSource.id ? 'case-assignment-row active' : 'case-assignment-row'} role="row">
            <button type="button" onClick={() => props.selectActiveSource(source.id)}>
              <strong>{source.title}</strong>
              <small>{source.kind}</small>
            </button>
            <select
              value={props.cases.find((item) => item.sourceIds.includes(source.id))?.id ?? ''}
              aria-label={`Assigned case for ${source.title}`}
              onFocus={() => props.selectActiveSource(source.id)}
              onChange={(event) => props.assignSourceToCase(source.id, event.target.value)}
            >
              <option value="">No case</option>
              {props.cases.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="case-table" role="table" aria-label="Case attributes">
        <div className="case-row case-row-head" role="row" style={{ gridTemplateColumns: props.caseGridTemplate }}>
          <span>Case</span>
          <span>Sources</span>
          {props.attributes.map((attribute) => (
            <span key={attribute.id}>{attribute.name}</span>
          ))}
          <span>Notes</span>
          <span />
        </div>
        {props.cases.map((item) => {
          const linkedSources = props.sources.filter((source) => item.sourceIds.includes(source.id))

          return (
            <div key={item.id} className="case-row" role="row" style={{ gridTemplateColumns: props.caseGridTemplate }}>
              <input value={item.name} aria-label="Case name" onChange={(event) => props.updateCase(item.id, { name: event.target.value })} />
              <small>{linkedSources.map((source) => source.title).join(', ') || '-'}</small>
              {props.attributes.map((attribute) => (
                <input
                  key={attribute.id}
                  value={props.attributeValues.find((value) => value.caseId === item.id && value.attributeId === attribute.id)?.value ?? ''}
                  aria-label={`${attribute.name} for ${item.name}`}
                  onChange={(event) => props.updateAttributeValue(item.id, attribute.id, event.target.value)}
                />
              ))}
              <input
                value={item.description}
                aria-label={`Notes for ${item.name}`}
                placeholder="Optional note"
                onChange={(event) => props.updateCase(item.id, { description: event.target.value })}
              />
              <button className="icon-button danger-icon" type="button" aria-label={`Delete ${item.name}`} onClick={() => props.deleteCase(item.id)}>
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </div>
          )
        })}
        {!props.cases.length && (
          <div className="empty-table-state">
            <strong>No cases yet</strong>
            <span>Create cases from sources, then fill in participant attributes here.</span>
          </div>
        )}
      </div>
      <div className="coming-soon-strip">
        <strong>Coming soon</strong>
        <span>Attribute import, case groups, and spreadsheet-style filtering.</span>
      </div>
    </article>
  )
}
