import { describe, expect, it } from 'vitest'
import { gradeAnswer } from './gradeAnswer'

describe('gradeAnswer', () => {
  const common = { concept: 'fertilisation', question: 'Where does fertilisation take place?', expected: 'oviduct', attempt: 1 }

  it('recognizes expected and accepted answers case-insensitively', async () => {
    await expect(gradeAnswer({ ...common, stepId: 2, studentAnswer: '  FALLOPIAN TUBE! ' })).resolves.toMatchObject({ grade: 'correct' })
  })

  it('reports a configured misconception', async () => {
    await expect(gradeAnswer({ ...common, stepId: 2, studentAnswer: 'uterus' })).resolves.toMatchObject({ grade: 'wrong_idea', confusedWith: 'implantation' })
  })

  it('treats very short answers as unclear', async () => {
    await expect(gradeAnswer({ ...common, stepId: 2, studentAnswer: 'x' })).resolves.toMatchObject({ grade: 'unclear' })
  })

  it('marks other substantive answers as wrong idea', async () => {
    await expect(gradeAnswer({ ...common, stepId: 2, studentAnswer: 'somewhere else' })).resolves.toMatchObject({ grade: 'wrong_idea', confusedWith: null })
  })
})
