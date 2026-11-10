import { describe, expect, it } from 'vitest'
import { assignStepIds, validateLesson, type GeneratedLesson } from './lessonSchema'

const validLesson: GeneratedLesson = {
  title: 'Sample lesson',
  concepts: ['first', 'second', 'third'],
  steps: [
    { concept: 'first', say: 'Teach first.', write: 'First', check: { question: 'What is first?', expected: 'first', acceptedAnswers: ['first'] }, reexplain: { say: 'Review first.', write: 'First again' } },
    { concept: 'second', say: 'Teach second.', write: 'Second', check: { question: 'What is second?', expected: 'second', acceptedAnswers: ['second'] }, reexplain: { say: 'Review second.', write: 'Second again' } },
    { concept: 'third', say: 'Teach third.', write: 'Third', check: { question: 'What is third?', expected: 'third', acceptedAnswers: ['third'] }, reexplain: { say: 'Review third.', write: 'Third again' } },
    { concept: 'first', say: 'Review first.', write: 'Review', check: { question: 'Which concept?', expected: 'first', acceptedAnswers: ['first'] }, reexplain: { say: 'Review once more.', write: 'Review again' } },
  ],
}

describe('lessonSchema', () => {
  it('accepts a valid lesson', () => {
    expect(validateLesson(validLesson)).toEqual({ ok: true, lesson: validLesson })
  })

  it('rejects more than eight steps', () => {
    const invalid = { ...validLesson, steps: [...validLesson.steps, ...validLesson.steps.slice(0, 5)] }
    expect(validateLesson(invalid)).toEqual({ ok: false, error: 'invalid_lesson' })
  })

  it('rejects a missing check', () => {
    const invalid = {
      ...validLesson,
      steps: validLesson.steps.map((step, index) => {
        if (index !== 0) return step
        const { check: _check, ...stepWithoutCheck } = step
        return stepWithoutCheck
      }),
    }
    expect(validateLesson(invalid)).toEqual({ ok: false, error: 'invalid_lesson' })
  })

  it('rejects an unknown step concept', () => {
    const invalid = {
      ...validLesson,
      steps: validLesson.steps.map((step, index) => index === 0 ? { ...step, concept: 'unknown' } : step),
    }
    expect(validateLesson(invalid)).toEqual({ ok: false, error: 'invalid_lesson' })
  })

  it('rejects overlong text', () => {
    const invalid = {
      ...validLesson,
      steps: validLesson.steps.map((step, index) => index === 0 ? { ...step, say: 'x'.repeat(401) } : step),
    }
    expect(validateLesson(invalid)).toEqual({ ok: false, error: 'invalid_lesson' })
  })

  it('rejects duplicate concepts', () => {
    const invalid = { ...validLesson, concepts: ['first', 'first', 'third'] }
    expect(validateLesson(invalid)).toEqual({ ok: false, error: 'invalid_lesson' })
  })

  it('rejects duplicate diagram node ids', () => {
    const invalid = {
      ...validLesson,
      steps: validLesson.steps.map((step, index) => index === 0 ? {
        ...step,
        diagram: { type: 'flow' as const, nodes: [{ id: 'a', label: 'A' }, { id: 'a', label: 'B' }] },
      } : step),
    }
    expect(validateLesson(invalid)).toEqual({ ok: false, error: 'invalid_lesson' })
  })

  it('rejects an edge pointing to a missing node', () => {
    const invalid = {
      ...validLesson,
      steps: validLesson.steps.map((step, index) => index === 0 ? {
        ...step,
        diagram: { type: 'flow' as const, nodes: [{ id: 'a', label: 'A' }], edges: [{ from: 'a', to: 'missing' }] },
      } : step),
    }
    expect(validateLesson(invalid)).toEqual({ ok: false, error: 'invalid_lesson' })
  })

  it('rejects an unknown confusedWith concept even when the step has no diagram', () => {
    const invalid = {
      ...validLesson,
      steps: validLesson.steps.map((step, index) => index === 0 ? {
        ...step,
        check: { ...step.check, confusions: [{ word: 'other', confusedWith: 'unknown' }] },
      } : step),
    }
    expect(validateLesson(invalid)).toEqual({ ok: false, error: 'invalid_lesson' })
  })

  it('assigns step ids starting at one', () => {
    const assigned = assignStepIds(validLesson)
    expect(assigned.steps.map((step) => step.id)).toEqual([1, 2, 3, 4])
  })
})
