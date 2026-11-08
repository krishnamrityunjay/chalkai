import lesson from '../lesson.json'

export type Grade = 'correct' | 'partly_correct' | 'wrong_idea' | 'unclear'

export type GradeResult = {
  grade: Grade
  confusedWith: string | null
  feedback: string
}

export type GradeAnswerInput = {
  stepId: number
  concept: string
  question: string
  expected: string
  studentAnswer: string
  attempt: number
}

function normalizeAnswer(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
}

export async function gradeAnswer(input: GradeAnswerInput): Promise<GradeResult> {
  const answer = normalizeAnswer(input.studentAnswer)
  const expected = normalizeAnswer(input.expected)
  const step = lesson.steps.find((item) => item.id === input.stepId)
  const acceptedAnswers = step?.acceptedAnswers ?? []

  if ([expected, ...acceptedAnswers.map(normalizeAnswer)].some((candidate) => candidate && answer.includes(candidate))) {
    return { grade: 'correct', confusedWith: null, feedback: 'That’s right!' }
  }

  const confusion = step?.confusions.find(({ word }) => answer.includes(normalizeAnswer(word)))
  if (confusion) {
    return {
      grade: 'wrong_idea',
      confusedWith: confusion.confusedWith,
      feedback: `It sounds like you may be thinking of ${confusion.confusedWith}. Review the idea and try again.`,
    }
  }

  if (answer.length < 2) {
    return { grade: 'unclear', confusedWith: null, feedback: 'I didn’t catch that. Try a little more detail.' }
  }

  return { grade: 'wrong_idea', confusedWith: null, feedback: 'Not quite yet. Review the step and try again.' }
}
