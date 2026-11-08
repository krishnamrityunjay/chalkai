import { describe, expect, it } from 'vitest'
import { applyGrade, createInitialState } from './lessonEngine'
import type { GradeResult } from '../grading/gradeAnswer'

const step = { id: 1, concept: 'organs' }
const result = (grade: GradeResult['grade']): GradeResult => ({ grade, confusedWith: null, feedback: 'test feedback' })

describe('applyGrade', () => {
  it('marks a correct concept understood and advances', () => {
    const output = applyGrade(createInitialState(), step, result('correct'))
    expect(output.action).toBe('advance')
    expect(output.state.states.organs).toBe('understood')
    expect(output.state.currentStep).toBe(1)
    expect(output.state.attempts[1]).toBe(1)
  })

  it('uses followup for partly correct answers without changing concept state', () => {
    const initial = createInitialState()
    const output = applyGrade(initial, step, result('partly_correct'))
    expect(output.action).toBe('followup')
    expect(output.state.states.organs).toBe('not_taught')
    expect(output.state.currentStep).toBe(0)
  })

  it('reexplains the first wrong idea and marks the concept confused', () => {
    const output = applyGrade(createInitialState(), step, result('wrong_idea'))
    expect(output.action).toBe('reexplain')
    expect(output.state.states.organs).toBe('confused')
    expect(output.state.currentStep).toBe(0)
  })

  it('reveals and advances after a second wrong idea', () => {
    const first = applyGrade(createInitialState(), step, result('wrong_idea'))
    const second = applyGrade(first.state, step, result('wrong_idea'))
    expect(second.action).toBe('reveal_and_advance')
    expect(second.state.states.organs).toBe('confused')
    expect(second.state.currentStep).toBe(1)
  })

  it('rephrases unclear answers without counting an attempt', () => {
    const initial = createInitialState()
    const output = applyGrade(initial, step, result('unclear'))
    expect(output.action).toBe('rephrase')
    expect(output.state.attempts[1]).toBeUndefined()
    expect(output.state.currentStep).toBe(0)
  })
})
