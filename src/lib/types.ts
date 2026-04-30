// Shared domain types used by the destructive-op modules and consumed back
// into App.tsx. Extracting them out of App.tsx is the prerequisite for the
// pure-function refactor — keeps lib/ free of React imports.

export type Code = {
  id: string
  name: string
  color: string
  description: string
  parentCodeId?: string
}

export type Source = {
  id: string
  title: string
  kind: 'Transcript' | 'Document'
  folder: string
  content: string
  archived?: boolean
  importedAt?: string
  caseName?: string
}

export type Case = {
  id: string
  name: string
  description: string
  sourceIds: string[]
}

export type Attribute = {
  id: string
  name: string
  valueType: 'text'
}

export type AttributeValue = {
  caseId: string
  attributeId: string
  value: string
}

export type Memo = {
  id: string
  title: string
  body: string
  linkedType: 'project' | 'source' | 'code'
  linkedId?: string
}

export type Excerpt = {
  id: string
  codeIds: string[]
  sourceId: string
  sourceTitle: string
  text: string
  note: string
}
