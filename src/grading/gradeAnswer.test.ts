import { describe, expect, it } from 'vitest'
import { gradeAnswer, type GradeAnswerInput } from './gradeAnswer'

function makeInput(overrides: Partial<GradeAnswerInput> = {}): GradeAnswerInput {
  return {
    stepId: 2,
    concept: 'fertilisation',
    question: 'Where does fertilisation take place?',
    expected: 'oviduct',
    acceptedAnswers: ['oviduct', 'fallopian tube', 'fallopian'],
    confusions: [
      { word: 'uterus', confusedWith: 'implantation' },
      { word: 'ovary', confusedWith: 'organs' },
    ],
    studentAnswer: '',
    attempt: 1,
    ...overrides,
  }
}

describe('gradeAnswer', () => {
  it('accepts expected and configured answer phrases, ignoring case and punctuation', async () => {
    await expect(gradeAnswer(makeInput({ studentAnswer: '  FALLOPIAN TUBE! ' })))
      .resolves.toMatchObject({ grade: 'correct' })
  })

  it('reports a configured confusion', async () => {
    await expect(gradeAnswer(makeInput({ studentAnswer: 'uterus' })))
      .resolves.toMatchObject({ grade: 'wrong_idea', confusedWith: 'implantation' })
  })

  it('marks short answers unclear', async () => {
    await expect(gradeAnswer(makeInput({ studentAnswer: 'x' })))
      .resolves.toMatchObject({ grade: 'unclear' })
  })

  it('marks other substantive answers as wrong ideas', async () => {
    await expect(gradeAnswer(makeInput({ studentAnswer: 'somewhere else' })))
      .resolves.toMatchObject({ grade: 'wrong_idea', confusedWith: null })
  })
})
