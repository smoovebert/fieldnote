export type AnalyzePanel = 'query' | 'matrix' | 'frequency' | 'cooccurrence' | 'crosstab'
export type WordFreqView = 'bar' | 'cloud' | 'table'
export type CooccurView  = 'heatmap' | 'network' | 'table'
export type MatrixView   = 'heatmap' | 'bars' | 'table'
export type CrosstabPercentMode = 'count' | 'row' | 'col'

export type CrosstabConfig = {
  attr1Id: string | null
  attr2Id: string | null
  percentMode: CrosstabPercentMode
  topNRows: number
  topNCols: number
}

export type AnalyzeViewState = {
  wordFreq: { view: WordFreqView; topN: number }
  cooccur:  { view: CooccurView;  topN: number }
  matrix:   { view: MatrixView;   topNRows: number; topNCols: number }
  crosstab: CrosstabConfig
}

export const DEFAULT_ANALYZE_VIEW: AnalyzeViewState = {
  wordFreq: { view: 'bar',     topN: 25 },
  cooccur:  { view: 'heatmap', topN: 30 },
  matrix:   { view: 'heatmap', topNRows: 30, topNCols: 30 },
  crosstab: { attr1Id: null, attr2Id: null, percentMode: 'count', topNRows: 30, topNCols: 40 },
}

export const TOP_N_BOUNDS = {
  wordFreq:      { min: 5, max: 200 },
  cooccur:       { min: 5, max: 100 },
  matrixRows:    { min: 5, max: 50  },
  matrixCols:    { min: 5, max: 50  },
  crosstabRows:  { min: 5, max: 30  },
  crosstabCols:  { min: 5, max: 40  },
} as const

export function serialize(state: AnalyzeViewState): AnalyzeViewState {
  return {
    wordFreq: { view: state.wordFreq.view, topN: state.wordFreq.topN },
    cooccur:  { view: state.cooccur.view,  topN: state.cooccur.topN  },
    matrix:   {
      view: state.matrix.view,
      topNRows: state.matrix.topNRows,
      topNCols: state.matrix.topNCols,
    },
    crosstab: {
      attr1Id: state.crosstab.attr1Id,
      attr2Id: state.crosstab.attr2Id,
      percentMode: state.crosstab.percentMode,
      topNRows: state.crosstab.topNRows,
      topNCols: state.crosstab.topNCols,
    },
  }
}

export function clampTopN(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, Math.floor(value)))
}

const WORD_FREQ_VIEWS: WordFreqView[] = ['bar', 'cloud', 'table']
const COOCCUR_VIEWS:   CooccurView[]  = ['heatmap', 'network', 'table']
const MATRIX_VIEWS:    MatrixView[]   = ['heatmap', 'bars', 'table']
const PERCENT_MODES:   CrosstabPercentMode[] = ['count', 'row', 'col']

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function pickView<T extends string>(raw: unknown, allowed: T[], fallback: T): T {
  return typeof raw === 'string' && (allowed as string[]).includes(raw) ? (raw as T) : fallback
}

function pickStringOrNull(raw: unknown): string | null {
  return typeof raw === 'string' && raw.length > 0 ? raw : null
}

export function deserialize(definition: { analyzeView?: unknown } | undefined): AnalyzeViewState {
  if (!definition) return DEFAULT_ANALYZE_VIEW
  const raw = (definition as { analyzeView?: unknown }).analyzeView
  if (raw === undefined) return DEFAULT_ANALYZE_VIEW
  if (!isPlainObject(raw)) {
    console.warn('[analyzeViewState] analyzeView is not an object; using defaults', raw)
    return DEFAULT_ANALYZE_VIEW
  }

  const wf = isPlainObject(raw.wordFreq) ? raw.wordFreq : {}
  const co = isPlainObject(raw.cooccur)  ? raw.cooccur  : {}
  const mx = isPlainObject(raw.matrix)   ? raw.matrix   : {}
  const ct = isPlainObject(raw.crosstab) ? raw.crosstab : {}

  return {
    wordFreq: {
      view: pickView(wf.view, WORD_FREQ_VIEWS, DEFAULT_ANALYZE_VIEW.wordFreq.view),
      topN: clampTopN(
        typeof wf.topN === 'number' ? wf.topN : DEFAULT_ANALYZE_VIEW.wordFreq.topN,
        TOP_N_BOUNDS.wordFreq.min,
        TOP_N_BOUNDS.wordFreq.max,
      ),
    },
    cooccur: {
      view: pickView(co.view, COOCCUR_VIEWS, DEFAULT_ANALYZE_VIEW.cooccur.view),
      topN: clampTopN(
        typeof co.topN === 'number' ? co.topN : DEFAULT_ANALYZE_VIEW.cooccur.topN,
        TOP_N_BOUNDS.cooccur.min,
        TOP_N_BOUNDS.cooccur.max,
      ),
    },
    matrix: {
      view: pickView(mx.view, MATRIX_VIEWS, DEFAULT_ANALYZE_VIEW.matrix.view),
      topNRows: clampTopN(
        typeof mx.topNRows === 'number' ? mx.topNRows : DEFAULT_ANALYZE_VIEW.matrix.topNRows,
        TOP_N_BOUNDS.matrixRows.min,
        TOP_N_BOUNDS.matrixRows.max,
      ),
      topNCols: clampTopN(
        typeof mx.topNCols === 'number' ? mx.topNCols : DEFAULT_ANALYZE_VIEW.matrix.topNCols,
        TOP_N_BOUNDS.matrixCols.min,
        TOP_N_BOUNDS.matrixCols.max,
      ),
    },
    crosstab: {
      attr1Id: pickStringOrNull(ct.attr1Id),
      attr2Id: pickStringOrNull(ct.attr2Id),
      percentMode: pickView(ct.percentMode, PERCENT_MODES, DEFAULT_ANALYZE_VIEW.crosstab.percentMode),
      topNRows: clampTopN(
        typeof ct.topNRows === 'number' ? ct.topNRows : DEFAULT_ANALYZE_VIEW.crosstab.topNRows,
        TOP_N_BOUNDS.crosstabRows.min,
        TOP_N_BOUNDS.crosstabRows.max,
      ),
      topNCols: clampTopN(
        typeof ct.topNCols === 'number' ? ct.topNCols : DEFAULT_ANALYZE_VIEW.crosstab.topNCols,
        TOP_N_BOUNDS.crosstabCols.min,
        TOP_N_BOUNDS.crosstabCols.max,
      ),
    },
  }
}
