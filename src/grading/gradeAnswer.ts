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

function normalize(value: string) {
  return value.toLowerCase().trim().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ')
}

export async function gradeAnswer(input: GradeAnswerInput): Promise<GradeResult> {
  const answer = normalize(input.studentAnswer)
  const step = lesson.steps.find((item) => item.id === input.stepId)
  const acceptedAnswers = step?.acceptedAnswers ?? []
  const correctTerms = [input.expected, ...acceptedAnswers].map(normalize).filter(Boolean)

  if (correctTerms.some((term) => answer.includes(term))) {
    return { grade: 'correct', confusedWith: null, feedback: 'That’s right!' }
  }

  const confusion = step?.confusions.find(({ word }) => answer.includes(normalize(word)))
  if (confusion) {
    return {
      grade: 'wrong_idea',
      confusedWith: confusion.confusedWith,
      feedback: `That answer matches ${confusion.word}. Review this step and try again.`,
    }
  }

  if (answer.length < 2) {
    return { grade: 'unclear', confusedWith: null, feedback: 'I didn’t catch that. Try a little more detail.' }
  }

  return { grade: 'wrong_idea', confusedWith: null, feedback: 'Not quite yet. Review the step and try again.' }
}
