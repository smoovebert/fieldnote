import {
  type AnalyzeViewState,
  deserialize as deserializeAnalyzeView,
} from './analyzeViewState'

export type AttributeFilter = { attributeId: string; value: string }

export type QueryDefinition = {
  text: string
  codeId: string
  caseId: string
  attributes: AttributeFilter[]
  analyzeView?: AnalyzeViewState
}

type DefinitionInput =
  & Partial<QueryDefinition>
  & Partial<{ attributeId: unknown; attributeValue: unknown }>
  & { analyzeView?: unknown }

function isAttributeFilter(value: unknown): value is AttributeFilter {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as AttributeFilter).attributeId === 'string' &&
    typeof (value as AttributeFilter).value === 'string' &&
    (value as AttributeFilter).attributeId.length > 0
  )
}

export function normalizeQueryDefinition(definition?: DefinitionInput | null): QueryDefinition {
  const text = typeof definition?.text === 'string' ? definition.text : ''
  const codeId = typeof definition?.codeId === 'string' ? definition.codeId : ''
  const caseId = typeof definition?.caseId === 'string' ? definition.caseId : ''
  const analyzeView = deserializeAnalyzeView(
    definition ? { analyzeView: (definition as { analyzeView?: unknown }).analyzeView } : undefined,
  )

  let attributes: AttributeFilter[]
  if (Array.isArray(definition?.attributes)) {
    attributes = definition!.attributes.filter(isAttributeFilter)
  } else if (
    typeof definition?.attributeId === 'string' &&
    definition.attributeId.length > 0
  ) {
    attributes = [{
      attributeId: definition.attributeId,
      value: typeof definition.attributeValue === 'string' ? definition.attributeValue : '',
    }]
  } else {
    attributes = []
  }

  return { text, codeId, caseId, attributes, analyzeView }
}
