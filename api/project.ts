import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

type Code = {
  id: string
  name: string
  color: string
  description: string
}

type Excerpt = {
  id: string
  codeIds: string[]
  sourceTitle: string
  text: string
  note: string
}

type ProjectData = {
  sourceTitle: string
  transcript: string
  memo: string
  codes: Code[]
  excerpts: Excerpt[]
}

const projectId = process.env.FIELDNOTE_PROJECT_ID ?? 'student-access-study'
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const fieldnoteAccessKey = process.env.FIELDNOTE_ACCESS_KEY

function sendError(response: VercelResponse, status: number, message: string) {
  response.status(status).json({ error: message })
}

function assertProjectData(body: unknown): ProjectData {
  const data = body as Partial<ProjectData>

  if (!data || typeof data !== 'object') {
    throw new Error('Project payload is missing.')
  }

  return {
    sourceTitle: String(data.sourceTitle ?? ''),
    transcript: String(data.transcript ?? ''),
    memo: String(data.memo ?? ''),
    codes: Array.isArray(data.codes) ? (data.codes as Code[]) : [],
    excerpts: Array.isArray(data.excerpts) ? (data.excerpts as Excerpt[]) : [],
  }
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (!supabaseUrl || !supabaseServiceRoleKey || !fieldnoteAccessKey) {
    return sendError(response, 500, 'Supabase environment variables are not configured.')
  }

  if (request.headers['x-fieldnote-key'] !== fieldnoteAccessKey) {
    return sendError(response, 401, 'Invalid Fieldnote access key.')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

  if (request.method === 'GET') {
    const { data, error } = await supabase.from('fieldnote_projects').select('*').eq('id', projectId).maybeSingle()

    if (error) return sendError(response, 500, error.message)
    if (!data) return sendError(response, 404, 'Project has not been saved yet.')

    return response.status(200).json({
      sourceTitle: data.source_title,
      transcript: data.transcript,
      memo: data.memo,
      codes: data.codes,
      excerpts: data.excerpts,
    } satisfies ProjectData)
  }

  if (request.method === 'PUT') {
    let project: ProjectData

    try {
      project = assertProjectData(request.body)
    } catch (error) {
      return sendError(response, 400, error instanceof Error ? error.message : 'Invalid project payload.')
    }

    const { error } = await supabase.from('fieldnote_projects').upsert({
      id: projectId,
      source_title: project.sourceTitle,
      transcript: project.transcript,
      memo: project.memo,
      codes: project.codes,
      excerpts: project.excerpts,
    })

    if (error) return sendError(response, 500, error.message)

    return response.status(200).json({ ok: true })
  }

  response.setHeader('Allow', 'GET, PUT')
  return sendError(response, 405, 'Method not allowed.')
}
