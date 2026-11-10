import { describe, expect, it } from 'vitest'
import { advanceStep, applyGrade, createInitialState } from './lessonEngine'
import type { GradeResult } from '../grading/gradeAnswer'

const step = { id: 1, concept: 'organs' }
const grade = (value: GradeResult['grade']): GradeResult => ({ grade: value, confusedWith: null, feedback: 'feedback' })

describe('lesson engine actions', () => {
  it('marks correct concepts understood and leaves currentStep unchanged until Continue', () => {
    const result = applyGrade(createInitialState(), step, grade('correct'))
    expect(result.action).toBe('advance')
    expect(result.state.states.organs).toBe('understood')
    expect(result.state.currentStep).toBe(0)

    const continued = advanceStep(result.state)
    expect(continued.currentStep).toBe(1)
    expect(continued.attempts[1]).toBe(0)
  })

  it('follows up on partly correct answers without changing concept state or currentStep', () => {
    const result = applyGrade(createInitialState(), step, grade('partly_correct'))
    expect(result.action).toBe('followup')
    expect(result.state.states.organs).toBe('not_taught')
    expect(result.state.currentStep).toBe(0)
  })

  it('reexplains the first wrong idea and marks the concept confused without moving the step', () => {
    const result = applyGrade(createInitialState(), step, grade('wrong_idea'))
    expect(result.action).toBe('reexplain')
    expect(result.state.states.organs).toBe('confused')
    expect(result.state.attempts[step.id]).toBe(1)
    expect(result.state.currentStep).toBe(0)
  })

  it('reveals and advances after a second wrong idea but does not advance until Continue', () => {
    const first = applyGrade(createInitialState(), step, grade('wrong_idea'))
    const second = applyGrade(first.state, step, grade('wrong_idea'))
    expect(second.action).toBe('reveal_and_advance')
    expect(second.state.currentStep).toBe(0)
    expect(advanceStep(second.state).currentStep).toBe(1)
  })

  it('rephrases unclear answers without counting an attempt', () => {
    const initial = createInitialState()
    const result = applyGrade(initial, step, grade('unclear'))
    expect(result.action).toBe('rephrase')
    expect(result.state.attempts[step.id]).toBeUndefined()
    expect(result.state.currentStep).toBe(0)
  })
})
