import type { GradeAnswerInput } from './gradeAnswer'
import type { GradeAnswerWithSource } from './gradeAnswerRemote'
import { gradeAnswer as gradeAnswerLocal } from './gradeAnswer'
import { gradeAnswerRemote } from './gradeAnswerRemote'

const useRemote = import.meta.env.VITE_USE_REMOTE_GRADER === 'true'

export async function gradeAnswer(input: GradeAnswerInput): Promise<GradeAnswerWithSource> {
  return useRemote
    ? gradeAnswerRemote(input)
    : { ...await gradeAnswerLocal(input), source: 'local' }
}
