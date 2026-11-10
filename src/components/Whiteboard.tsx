import { useCallback, useEffect, useRef, useState } from 'react'
import lesson from '../lesson.json'
import { useTypewriter } from '../hooks/useTypewriter'
import './Whiteboard.css'
import { applyGrade, advanceStep, createInitialState } from '../engine/lessonEngine'
import { gradeAnswer } from '../grading'

const diagramParts = [
  { name: 'ovary', x: 16, y: 12 },
  { name: 'oviduct', x: 130, y: 12 },
  { name: 'uterus', x: 244, y: 12 },
  { name: 'zygote', x: 16, y: 102 },
  { name: 'blastocyst', x: 130, y: 102 },
  { name: 'endometrium', x: 244, y: 102 },
] as const

type LessonStep = (typeof lesson.steps)[number]
type WhiteboardProps = { onBack: () => void }

type GradeAction = 'advance' | 'followup' | 'reexplain' | 'rephrase' | 'reveal_and_advance'

function splitSentences(text: string) {
  return text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? []
}

function chooseEnglishVoice(voices: SpeechSynthesisVoice[]) {
  return voices.find((voice) => voice.lang.toLowerCase().startsWith('en-in'))
    ?? voices.find((voice) => voice.lang.toLowerCase().startsWith('en-gb'))
    ?? voices.find((voice) => voice.lang.toLowerCase().startsWith('en'))
}

function LessonDiagram({ step, revealedParts }: { step: LessonStep; revealedParts: string[] }) {
  return (
    <div className="diagram-wrap" aria-label="Placeholder diagram of lesson parts">
      <svg className="lesson-diagram" viewBox="0 0 360 166" role="img" aria-labelledby="diagram-title">
        <title id="diagram-title">Diagram parts highlighted for step {step.id}</title>
        {diagramParts.map((part) => {
          const isHighlighted = step.highlight.includes(part.name)
          const isRevealed = revealedParts.includes(part.name)
          return (
            <g
              key={part.name}
              className={`diagram-part${isRevealed ? ' is-revealed' : ''}${isHighlighted && !isRevealed ? ' is-pending' : ''}`}
              transform={`translate(${part.x} ${part.y})`}
            >
              <rect className="diagram-box" width="100" height="48" rx="9" />
              <text className="diagram-text" x="50" y="29" textAnchor="middle">{part.name}</text>
            </g>
          )
        })}
      </svg>
      <p className="diagram-caption">Placeholder diagram · verified diagrams will be added later</p>
    </div>
  )
}

function Whiteboard({ onBack }: WhiteboardProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [engineState, setEngineState] = useState(() => createInitialState())
  const [revealedParts, setRevealedParts] = useState<string[]>([])
  const [writingStarted, setWritingStarted] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [speechError, setSpeechError] = useState(false)
  const [questionVisible, setQuestionVisible] = useState(false)
  const [answer, setAnswer] = useState('')
  const [feedbackText, setFeedbackText] = useState<string | null>(null)
  const [revealedAnswer, setRevealedAnswer] = useState<string | null>(null)
  const [gradeAction, setGradeAction] = useState<GradeAction | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const boardRef = useRef<HTMLElement>(null)
  const runIdRef = useRef(0)
  const timersRef = useRef<number[]>([])
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const step = lesson.steps[stepIndex]
  const { visibleText, done } = useTypewriter(step.write, writingStarted)
  const isLastStep = stepIndex === lesson.steps.length - 1

  const clearPlayback = useCallback(() => {
    runIdRef.current += 1
    timersRef.current.forEach(window.clearTimeout)
    timersRef.current = []
    activeUtteranceRef.current = null
    if (speechSupported) window.speechSynthesis.cancel()
    setIsPaused(false)
  }, [speechSupported])

  useEffect(() => () => {
    runIdRef.current += 1
    timersRef.current.forEach(window.clearTimeout)
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }, [])

  const revealForSentence = useCallback((targetStep: LessonStep, sentenceIndex: number) => {
    setWritingStarted(true)
    const sentenceCount = splitSentences(targetStep.say).length
    const count = Math.ceil(((sentenceIndex + 1) * targetStep.highlight.length) / sentenceCount)
    setRevealedParts(targetStep.highlight.slice(0, count))
  }, [])

  const beginStep = useCallback((targetIndex: number) => {
    clearPlayback()
    const targetStep = lesson.steps[targetIndex]
    const sentences = splitSentences(targetStep.say)
    const runId = runIdRef.current

    setStepIndex(targetIndex)
    setEngineState((current) => ({ ...current, currentStep: targetIndex }))
    setHasStarted(true)
    setQuestionVisible(false)
    setSpeechError(false)
    setRevealedParts([])
    setWritingStarted(true)
    setFeedbackText(null)
    setRevealedAnswer(null)
    setAnswer('')
    setGradeAction(null)

    const revealSentence = (index: number) => {
      if (runId === runIdRef.current && index < sentences.length) {
        revealForSentence(targetStep, index)
      }
    }

    const continueTextOnly = (fromIndex: number) => {
      const revealNext = (index: number) => {
        if (runId !== runIdRef.current || index >= sentences.length) return
        revealSentence(index)
        if (index + 1 < sentences.length) {
          const delay = Math.max(700, sentences[index].length * 42)
          timersRef.current.push(window.setTimeout(() => revealNext(index + 1), delay))
        } else {
          setQuestionVisible(true)
        }
      }
      if (fromIndex < sentences.length) {
        const delay = Math.max(700, sentences[Math.max(0, fromIndex - 1)].length * 42)
        timersRef.current.push(window.setTimeout(() => revealNext(fromIndex), delay))
      }
    }

    if (!speechSupported || isMuted) {
      continueTextOnly(1)
      return
    }

    const voice = chooseEnglishVoice(window.speechSynthesis.getVoices())
    const speakSentence = (index: number) => {
      if (runId !== runIdRef.current || index >= sentences.length) {
        if (runId === runIdRef.current) setQuestionVisible(true)
        return
      }
      const utterance = new SpeechSynthesisUtterance(sentences[index])
      if (voice) utterance.voice = voice
      utterance.lang = voice?.lang ?? 'en'
      activeUtteranceRef.current = utterance
      utterance.onstart = () => revealSentence(index)
      utterance.onend = () => {
        if (runId === runIdRef.current) speakSentence(index + 1)
      }
      utterance.onerror = () => {
        if (runId !== runIdRef.current) return
        setSpeechError(true)
        revealSentence(index)
        continueTextOnly(index + 1)
      }
      window.speechSynthesis.speak(utterance)
    }
    speakSentence(0)
  }, [clearPlayback, isMuted, revealForSentence, speechSupported])

  useEffect(() => {
    const board = boardRef.current
    if (board) board.scrollTo({ top: board.scrollHeight, behavior: 'smooth' })
  }, [stepIndex, visibleText, revealedParts, questionVisible, feedbackText, revealedAnswer])

  const goBack = () => {
    clearPlayback()
    onBack()
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!questionVisible || !answer.trim() || isSubmitting) return
    setIsSubmitting(true)

    const result = await gradeAnswer({
      stepId: step.id,
      concept: step.concept,
      question: step.check,
      expected: step.expected,
      acceptedAnswers: step.acceptedAnswers,
      confusions: step.confusions,
      studentAnswer: answer,
      attempt: (engineState.attempts[step.id] ?? 0) + 1,
    })

    const engineResult = applyGrade(engineState, step, result)
    setEngineState(engineResult.state)
    setGradeAction(engineResult.action)
    setFeedbackText(result.feedback)
    setRevealedAnswer(engineResult.action === 'reveal_and_advance' ? step.expected : null)
    setQuestionVisible(engineResult.action === 'followup' || engineResult.action === 'rephrase' || engineResult.action === 'reexplain')
    setAnswer('')
    setIsSubmitting(false)
  }

  const goNext = () => {
    if (gradeAction === 'advance' || gradeAction === 'reveal_and_advance') {
      const nextState = advanceStep(engineState)
      setEngineState(nextState)
      setFeedbackText(null)
      setRevealedAnswer(null)
      setGradeAction(null)
      if (nextState.currentStep >= lesson.steps.length) {
        clearPlayback()
        onBack()
        return
      }
      beginStep(nextState.currentStep)
    }
  }

  const toggleMute = () => {
    const nextMuted = !isMuted
    clearPlayback()
    setIsMuted(nextMuted)
    if (nextMuted && hasStarted) {
      setWritingStarted(true)
      setRevealedParts(step.highlight)
    }
  }

  const togglePause = () => {
    if (!speechSupported || isMuted || !hasStarted) return
    if (isPaused) {
      window.speechSynthesis.resume()
      setIsPaused(false)
    } else {
      window.speechSynthesis.pause()
      setIsPaused(true)
    }
  }

  return (
    <main className="whiteboard-page">
      <header className="whiteboard-header">
        <button className="back-button" onClick={goBack}><span aria-hidden="true">←</span> Back</button>
        <span className="whiteboard-brand">Chalk<span>AI</span></span>
        <span className="step-count">Step {stepIndex + 1} of {lesson.steps.length}</span>
      </header>

      <section className="whiteboard-area" ref={boardRef} aria-label={`${lesson.topic}, step ${stepIndex + 1}`}>
        <p className="board-label">{lesson.topic}</p>
        <p className="lesson-say">{step.say}</p>
        <LessonDiagram step={step} revealedParts={revealedParts} />
        <div className="written-board" aria-live="polite">
          <p className="written-label">ON THE BOARD</p>
          <p className="lesson-sentence">{visibleText}<span className="typewriter-cursor" aria-hidden="true">{done ? '' : '|'}</span></p>
        </div>

        {questionVisible && (
          <form className="answer-form" onSubmit={handleSubmit}>
            <label htmlFor="step-answer">{step.check}</label>
            <div className="answer-controls">
              <input id="step-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Type your answer" autoComplete="off" />
              <button type="submit" disabled={!answer.trim() || isSubmitting}>Submit</button>
            </div>
            {feedbackText && <p className="grade-feedback" role="status">{feedbackText}</p>}
            {revealedAnswer && <p className="grade-feedback" role="status">Expected answer: <strong>{revealedAnswer}</strong></p>}
          </form>
        )}

        {!questionVisible && feedbackText && (gradeAction === 'advance' || gradeAction === 'reveal_and_advance') && (
          <div className="answer-form">
            <p className="grade-feedback" role="status">{feedbackText}</p>
            <button type="button" className="continue-button" onClick={goNext}>Continue</button>
          </div>
        )}
      </section>

      <footer className="whiteboard-footer">
        <p className="lesson-status" aria-live="polite">
          {!hasStarted ? 'Tap play to begin this step.' : speechError ? 'Speech was blocked; lesson text is shown.' : done ? (isLastStep ? 'You’ve reached the last step.' : 'Ready when you are.') : 'Lesson in progress.'}
          {!speechSupported && hasStarted ? ' Speech is unavailable in this browser.' : ''}
        </p>
        <div className="lesson-navigation">
          <button type="button" className="audio-control" onClick={togglePause} disabled={!speechSupported || isMuted || !hasStarted}>{isPaused ? 'Resume' : 'Pause'}</button>
          <button type="button" className="audio-control" onClick={toggleMute}>{isMuted ? 'Unmute' : 'Mute'}</button>
          {!hasStarted ? (
            <button type="button" className="next-button" onClick={() => beginStep(stepIndex)}>Play lesson <span aria-hidden="true">▶</span></button>
          ) : (
            <button className="next-button" disabled={!done && !gradeAction} onClick={goNext}>
              {isLastStep ? 'Finish' : 'Next'} <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
      </footer>
    </main>
  )
}

export default Whiteboard
