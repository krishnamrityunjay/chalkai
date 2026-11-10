import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { callModel, isLlmEnabled } from './_llm'

const validResponse = {
  steps: [
    { type: 'user_input', content: [{ type: 'text', text: 'ignored input' }] },
    { type: 'model_output', content: [{ type: 'text', text: 'Hello ' }, { type: 'text', text: 'there.' }] },
  ],
}

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

beforeEach(() => {
  vi.stubEnv('LLM_ENABLED', 'true')
  vi.stubEnv('LLM_API_KEY', 'test-key-not-real')
  vi.stubEnv('LLM_MODEL', 'test-model')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(validResponse)))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('Gemini model wrapper', () => {
  it('is disabled unless enabled and both config values are present', () => {
    expect(isLlmEnabled()).toBe(true)
    vi.stubEnv('LLM_ENABLED', 'false')
    expect(isLlmEnabled()).toBe(false)
    vi.stubEnv('LLM_ENABLED', 'true')
    vi.stubEnv('LLM_API_KEY', '')
    expect(isLlmEnabled()).toBe(false)
    vi.stubEnv('LLM_API_KEY', 'test-key-not-real')
    vi.stubEnv('LLM_MODEL', ' ')
    expect(isLlmEnabled()).toBe(false)
  })

  it('joins text from model_output steps only', async () => {
    await expect(callModel({ system: 'system instructions', user: 'user input' })).resolves.toBe('Hello there.')
  })

  it('throws only the generic error for a non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ error: 'sensitive details' }, 503)))
    await expect(callModel({ system: 'private system', user: 'private answer' })).rejects.toThrow(/^llm_error$/)
  })

  it('throws only the generic error for an unexpected response shape', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ output_text: 'not the expected shape' })))
    await expect(callModel({ system: 'private system', user: 'private answer' })).rejects.toThrow(/^llm_error$/)
  })

  it('sends the API key only in the x-goog-api-key header', async () => {
    await callModel({ system: 'system instructions', user: 'student response' })
    const [url, options] = vi.mocked(fetch).mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/interactions')
    expect(url).not.toContain('test-key-not-real')
    expect(new Headers(options.headers).get('x-goog-api-key')).toBe('test-key-not-real')
    expect(options.body).not.toContain('test-key-not-real')
  })

  it('aborts requests after the seven-second timeout', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    })))

    const pending = callModel({ system: 'private system', user: 'private answer' })
    const rejection = expect(pending).rejects.toThrow(/^llm_error$/)
    await vi.advanceTimersByTimeAsync(7000)
    await rejection
    expect(vi.mocked(fetch)).toHaveBeenCalledOnce()
    expect(vi.mocked(fetch).mock.calls[0][1]?.signal?.aborted).toBe(true)
  })
})
