import { describe, expect, it } from 'vitest'
import { gradeAnswer } from './gradeAnswer'

describe('gradeAnswer', () => {
  const context = { concept: 'fertilisation', question: 'Where does fertilisation take place?', expected: 'oviduct', attempt: 1 }

  it('accepts expected and configured answer phrases, ignoring case and punctuation', async () => {
    await expect(gradeAnswer({ ...context, stepId: 2, studentAnswer: '  FALLOPIAN TUBE! ' })).resolves.toMatchObject({ grade: 'correct' })
  })

  it('reports a configured confusion', async () => {
    await expect(gradeAnswer({ ...context, stepId: 2, studentAnswer: 'uterus' })).resolves.toMatchObject({ grade: 'wrong_idea', confusedWith: 'implantation' })
  })

  it('marks short answers unclear', async () => {
    await expect(gradeAnswer({ ...context, stepId: 2, studentAnswer: 'x' })).resolves.toMatchObject({ grade: 'unclear' })
  })

  it('marks other substantive answers as wrong ideas', async () => {
    await expect(gradeAnswer({ ...context, stepId: 2, studentAnswer: 'somewhere else' })).resolves.toMatchObject({ grade: 'wrong_idea', confusedWith: null })
  })
})
