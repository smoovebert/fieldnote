// supabase/functions/ai-call/providers/anthropic.ts
import type { ProviderResponse } from './gemini.ts'

export async function callAnthropic(input: {
  apiKey: string
  model: string
  systemPrompt: string
  userPrompt: string
}): Promise<ProviderResponse> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': input.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: input.model,
      system: input.systemPrompt,
      messages: [{ role: 'user', content: input.userPrompt }],
      max_tokens: 2048,
      temperature: 0.4,
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Anthropic ${res.status}: ${errText.slice(0, 200)}`)
  }
  const json = await res.json()
  const text = (json?.content?.[0]?.text ?? '') as string
  return {
    text,
    promptTokens: json?.usage?.input_tokens ?? 0,
    completionTokens: json?.usage?.output_tokens ?? 0,
  }
}
