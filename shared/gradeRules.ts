export type Grade = 'correct' | 'partly_correct' | 'wrong_idea' | 'unclear'

export type ConfusionRule = { word: string; confusedWith: string }

export type GradeRulesInput = {
  expected: string
  acceptedAnswers: string[]
  confusions: ConfusionRule[]
  studentAnswer: string
}

export type GradeRulesResult = {
  grade: Grade
  confusedWith: string | null
  feedback: string
}

export function normalizeAnswer(value: string) {
  return value.toLowerCase().trim().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ')
}

export function applyGradeRules(input: GradeRulesInput): GradeRulesResult {
  const answer = normalizeAnswer(input.studentAnswer)
  const correctTerms = [input.expected, ...input.acceptedAnswers].map(normalizeAnswer).filter(Boolean)

  if (correctTerms.some((term) => answer.includes(term))) {
    return { grade: 'correct', confusedWith: null, feedback: 'That’s right!' }
  }

  const confusion = input.confusions.find(({ word }) => answer.includes(normalizeAnswer(word)))
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
