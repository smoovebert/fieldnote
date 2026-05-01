// supabase/functions/ai-call/providers/gemini.ts
export type ProviderResponse = {
  text: string
  promptTokens: number
  completionTokens: number
}

export async function callGemini(input: {
  apiKey: string
  model: string
  systemPrompt: string
  userPrompt: string
}): Promise<ProviderResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${input.model}:generateContent?key=${encodeURIComponent(input.apiKey)}`
  const body = {
    contents: [{ role: 'user', parts: [{ text: input.userPrompt }] }],
    systemInstruction: { parts: [{ text: input.systemPrompt }] },
    generationConfig: { temperature: 0.4, maxOutputTokens: 2048, responseMimeType: 'application/json' },
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 200)}`)
  }
  const json = await res.json()
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const promptTokens = json?.usageMetadata?.promptTokenCount ?? 0
  const completionTokens = json?.usageMetadata?.candidatesTokenCount ?? 0
  return { text, promptTokens, completionTokens }
}
