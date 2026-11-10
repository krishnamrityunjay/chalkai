const INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions'
const REQUEST_TIMEOUT_MS = 7000
const DEFAULT_MAX_OUTPUT_TOKENS = 300

type CallModelInput = {
  system: string
  user: string
  maxOutputTokens?: number
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isLlmEnabled(): boolean {
  return process.env.LLM_ENABLED === 'true'
    && Boolean(process.env.LLM_API_KEY?.trim())
    && Boolean(process.env.LLM_MODEL?.trim())
}

export async function callModel({ system, user, maxOutputTokens }: CallModelInput): Promise<string> {
  const apiKey = process.env.LLM_API_KEY?.trim()
  const model = process.env.LLM_MODEL?.trim()
  if (!apiKey || !model) throw new Error('llm_error')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(INTERACTIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        model,
        input: user,
        system_instruction: system,
        generation_config: {
          temperature: 0.1,
          max_output_tokens: maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
        },
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      console.info('llm_error', response.status)
      throw new Error('llm_error')
    }

    const payload: unknown = await response.json()
    if (!isRecord(payload) || !Array.isArray(payload.steps)) throw new Error('llm_error')

    const text = payload.steps
      .filter((step): step is UnknownRecord => isRecord(step) && step.type === 'model_output')
      .flatMap((step) => Array.isArray(step.content) ? step.content : [])
      .filter((item): item is UnknownRecord => isRecord(item) && item.type === 'text' && typeof item.text === 'string')
      .map((item) => item.text as string)
      .join('')

    if (!text.trim()) throw new Error('llm_error')
    return text
  } catch {
    // Never log provider errors: they can contain sensitive request/response data.
    throw new Error('llm_error')
  } finally {
    clearTimeout(timeout)
  }
}
