import { applyGradeRules, type ConfusionRule, type Grade } from '../../shared/gradeRules'

export type { Grade }
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
  acceptedAnswers: string[]
  confusions: ConfusionRule[]
  studentAnswer: string
  attempt: number
}

export async function gradeAnswer(input: GradeAnswerInput): Promise<GradeResult> {
  return applyGradeRules(input)
}
