// supabase/functions/ai-call/prompts.ts
export type PromptKind = 'suggest_codes' | 'draft_description' | 'summarize_source' | 'draft_memo'

export type PromptTemplate = {
  id: string             // versioned: bump to invalidate cache
  model: string          // model name passed to provider adapter
  cacheable: boolean
  systemPrompt: string
  buildUserPrompt: (input: string) => string
}

export const PROMPT_TEMPLATES: Record<PromptKind, PromptTemplate> = {
  suggest_codes: {
    id: 'SUGGEST_CODES_V1',
    model: 'gemini-2.0-flash',
    cacheable: false,
    systemPrompt:
      'You are an assistant for a qualitative-research coding tool. ' +
      'Given an excerpt from a participant interview or document, ' +
      'propose 5 short conceptual code names that capture distinct ' +
      'themes the excerpt expresses. Each code name is 1–4 words, ' +
      'sentence-cased, plain language, no jargon. For each code, ' +
      'include a one-sentence description (≤25 words). ' +
      'Return STRICT JSON: { "suggestions": [{ "name": "...", "description": "..." }, ...] }. ' +
      'No commentary, no markdown.',
    buildUserPrompt: (text) => `Excerpt:\n\n${text}`,
  },
  draft_description: {
    id: 'DRAFT_DESCRIPTION_V1',
    model: 'gemini-2.0-flash',
    cacheable: true,
    systemPrompt:
      'You are an assistant for a qualitative-research coding tool. ' +
      'Given a coded code (a theme) and several excerpts that share ' +
      'this code, draft a one-paragraph description (≤80 words) of ' +
      'what the code seems to capture across these excerpts. ' +
      'Use plain analytical prose, present tense, no headings. ' +
      'Return STRICT JSON: { "description": "..." }.',
    buildUserPrompt: (text) => text,
  },
  summarize_source: {
    id: 'SUMMARIZE_SOURCE_V1',
    model: 'gemini-2.0-flash',
    cacheable: true,
    systemPrompt:
      'You are an assistant for a qualitative-research coding tool. ' +
      'Given a source (e.g. an interview transcript), produce a ' +
      'three-sentence summary that names what the source is about, ' +
      'who is speaking if discernible, and what they primarily focus on. ' +
      'No bullets, no headings. ' +
      'Return STRICT JSON: { "summary": "..." }.',
    buildUserPrompt: (text) => text,
  },
  draft_memo: {
    id: 'DRAFT_MEMO_V1',
    model: 'gemini-2.0-flash',
    cacheable: true,
    systemPrompt:
      'You are an assistant for a qualitative-research coding tool. ' +
      'Given a list of pinned analysis snapshots — each containing a ' +
      'saved-query name and the excerpts it captured — draft a ' +
      'project-level memo (≤200 words) synthesizing the patterns ' +
      'these snapshots reveal. Plain analytical prose, present tense, ' +
      'cite snapshot names parenthetically. ' +
      'Return STRICT JSON: { "memo": "..." }.',
    buildUserPrompt: (text) => text,
  },
}

export function isValidKind(kind: string): kind is PromptKind {
  return kind in PROMPT_TEMPLATES
}
