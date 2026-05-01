// supabase/functions/ai-call/providers/openai.ts
import type { ProviderResponse } from './gemini.ts'

export async function callOpenAI(input: {
  apiKey: string
  model: string
  systemPrompt: string
  userPrompt: string
}): Promise<ProviderResponse> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${input.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: input.model,
      messages: [
        { role: 'system', content: input.systemPrompt },
        { role: 'user', content: input.userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`OpenAI ${res.status}: ${errText.slice(0, 200)}`)
  }
  const json = await res.json()
  return {
    text: json?.choices?.[0]?.message?.content ?? '',
    promptTokens: json?.usage?.prompt_tokens ?? 0,
    completionTokens: json?.usage?.completion_tokens ?? 0,
  }
}
