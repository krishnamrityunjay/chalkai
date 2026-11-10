import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applyGradeRules, type ConfusionRule, type GradeRulesInput } from '../shared/gradeRules'

type GradeRequestBody = GradeRulesInput & {
  stepId: number
  concept: string
  question: string
  attempt: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isConfusionRule(value: unknown): value is ConfusionRule {
  return isRecord(value) && isNonEmptyString(value.word) && isNonEmptyString(value.confusedWith)
}

function isValidBody(value: unknown): value is GradeRequestBody {
  if (!isRecord(value)) return false
  return Number.isInteger(value.stepId) && (value.stepId as number) > 0
    && isNonEmptyString(value.concept)
    && isNonEmptyString(value.question)
    && isNonEmptyString(value.expected)
    && isNonEmptyString(value.studentAnswer)
    && value.studentAnswer.length <= 300
    && Array.isArray(value.acceptedAnswers)
    && value.acceptedAnswers.length <= 20
    && value.acceptedAnswers.every(isNonEmptyString)
    && Array.isArray(value.confusions)
    && value.confusions.length <= 20
    && value.confusions.every(isConfusionRule)
    && Number.isInteger(value.attempt)
    && (value.attempt as number) >= 1
    && (value.attempt as number) <= 5
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    console.info('grade_status', 405, 'method_not_allowed')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  if (!isValidBody(req.body)) {
    console.info('grade_status', 400, 'invalid_input')
    return res.status(400).json({ error: 'invalid_input' })
  }

  const result = applyGradeRules(req.body)
  console.info('grade_status', 200, 'ok')
  return res.status(200).json({ ...result, source: 'mock' })
}
