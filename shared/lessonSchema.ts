import { z } from 'zod'

const nonEmptyString = z.string().trim().min(1)

const diagramNodeSchema = z.object({
  id: nonEmptyString,
  label: z.string().max(30),
})

const diagramSchema = z.object({
  type: z.enum(['flow', 'cycle', 'labelled_parts']),
  nodes: z.array(diagramNodeSchema).min(1).max(10),
  edges: z.array(z.object({
    from: nonEmptyString,
    to: nonEmptyString,
    label: z.string().optional(),
  })).optional(),
}).superRefine((diagram, context) => {
  const nodeIds = new Set(diagram.nodes.map((node) => node.id))
  if (nodeIds.size !== diagram.nodes.length) {
    context.addIssue({ code: 'custom', message: 'Diagram node ids must be unique', path: ['nodes'] })
  }

  diagram.edges?.forEach((edge, index) => {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      context.addIssue({ code: 'custom', message: 'Diagram edge references an unknown node', path: ['edges', index] })
    }
  })
})

const confusionSchema = z.object({
  word: nonEmptyString,
  confusedWith: nonEmptyString,
})

const lessonStepSchema = z.object({
  concept: nonEmptyString,
  say: z.string().max(400),
  write: z.string().max(120),
  check: z.object({
    question: nonEmptyString,
    expected: nonEmptyString,
    acceptedAnswers: z.array(nonEmptyString).min(1).max(6),
    confusions: z.array(confusionSchema).optional(),
  }),
  reexplain: z.object({
    say: z.string().max(400),
    write: z.string().max(120),
  }),
  diagram: diagramSchema.optional(),
})

export const lessonSchema = z.object({
  title: nonEmptyString,
  concepts: z.array(nonEmptyString).min(3).max(8),
  steps: z.array(lessonStepSchema).min(4).max(8),
}).superRefine((lesson, context) => {
  const conceptSet = new Set(lesson.concepts)

  if (conceptSet.size !== lesson.concepts.length) {
    context.addIssue({ code: 'custom', message: 'Lesson concepts must be unique', path: ['concepts'] })
  }

  lesson.steps.forEach((step, index) => {
    if (!conceptSet.has(step.concept)) {
      context.addIssue({ code: 'custom', message: 'Step concept is not listed', path: ['steps', index, 'concept'] })
    }

    step.check.confusions?.forEach((confusion, confusionIndex) => {
      if (!conceptSet.has(confusion.confusedWith)) {
        context.addIssue({
          code: 'custom',
          message: 'Confusion concept is not listed',
          path: ['steps', index, 'check', 'confusions', confusionIndex, 'confusedWith'],
        })
      }
    })
  })
})

export type GeneratedLesson = z.infer<typeof lessonSchema>
export type LessonWithStepIds = Omit<GeneratedLesson, 'steps'> & {
  steps: Array<GeneratedLesson['steps'][number] & { id: number }>
}

export function assignStepIds(lesson: GeneratedLesson): LessonWithStepIds {
  return {
    ...lesson,
    steps: lesson.steps.map((step, index) => ({ ...step, id: index + 1 })),
  }
}

export type ValidateLessonResult =
  | { ok: true; lesson: GeneratedLesson }
  | { ok: false; error: 'invalid_lesson' }

export function validateLesson(json: unknown): ValidateLessonResult {
  const parsed = lessonSchema.safeParse(json)
  return parsed.success
    ? { ok: true, lesson: parsed.data }
    : { ok: false, error: 'invalid_lesson' }
}
