import type { GradeResult } from '../grading/gradeAnswer'

export type ConceptState = 'not_taught' | 'understood' | 'confused'
export type LessonEngineState = {
  states: Record<string, ConceptState>
  attempts: Record<number, number>
  currentStep: number
}
export type EngineAction = 'advance' | 'followup' | 'reexplain' | 'reveal_and_advance' | 'rephrase'
export type EngineStep = { id: number; concept: string }

export const conceptChain = ['organs', 'fertilisation', 'cleavage', 'blastocyst', 'implantation'] as const

export function createInitialState(concepts: readonly string[] = conceptChain): LessonEngineState {
  return {
    states: Object.fromEntries(concepts.map((concept) => [concept, 'not_taught'])) as Record<string, ConceptState>,
    attempts: {},
    currentStep: 0,
  }
}

export function applyGrade(
  state: LessonEngineState,
  step: EngineStep,
  result: GradeResult,
): { state: LessonEngineState; action: EngineAction } {
  const next: LessonEngineState = {
    states: { ...state.states },
    attempts: { ...state.attempts },
    currentStep: state.currentStep,
  }

  if (result.grade === 'unclear') return { state: next, action: 'rephrase' }

  const attempt = (state.attempts[step.id] ?? 0) + 1
  next.attempts[step.id] = attempt

  if (result.grade === 'correct') {
    next.states[step.concept] = 'understood'
    return { state: next, action: 'advance' }
  }

  if (result.grade === 'partly_correct') return { state: next, action: 'followup' }

  next.states[step.concept] = 'confused'
  if (attempt === 1) return { state: next, action: 'reexplain' }

  return { state: next, action: 'reveal_and_advance' }
}

export function advanceStep(state: LessonEngineState): LessonEngineState {
  const nextIndex = state.currentStep + 1
  return {
    ...state,
    currentStep: nextIndex,
    attempts: {
      ...state.attempts,
      [nextIndex]: 0,
    },
  }
}

