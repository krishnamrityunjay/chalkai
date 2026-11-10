import type { GradeAnswerInput, GradeResult } from './gradeAnswer'
import { gradeAnswer as gradeAnswerLocal } from './gradeAnswer'

export type GradeAnswerWithSource = GradeResult & { source: 'server' | 'local' }

const grades = ['correct', 'partly_correct', 'wrong_idea', 'unclear'] as const

function isMockGradeResponse(value: unknown): value is GradeResult & { source: 'mock' } {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return grades.includes(candidate.grade as (typeof grades)[number])
    && (candidate.confusedWith === null || typeof candidate.confusedWith === 'string')
    && typeof candidate.feedback === 'string'
    && candidate.source === 'mock'
}

export async function gradeAnswerRemote(input: GradeAnswerInput): Promise<GradeAnswerWithSource> {
  const localFallback = async (): Promise<GradeAnswerWithSource> => ({
    ...await gradeAnswerLocal(input),
    source: 'local',
  })

  if (import.meta.env.VITE_USE_REMOTE_GRADER !== 'true') return localFallback()

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 8000)
  try {
    const response = await fetch('/api/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
      body: JSON.stringify(input),
    })
    if (!response.ok) return await localFallback()
    const payload: unknown = await response.json()
    if (!isMockGradeResponse(payload)) return await localFallback()
    return { grade: payload.grade, confusedWith: payload.confusedWith, feedback: payload.feedback, source: 'server' }
  } catch {
    return await localFallback()
  } finally {
    window.clearTimeout(timeout)
  }
}
