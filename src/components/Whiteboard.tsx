import { useCallback, useEffect, useRef, useState } from 'react'
import lesson from '../lesson.json'
import { gradeAnswer, type GradeResult } from '../grading/gradeAnswer'
import { applyGrade, conceptChain, createInitialState, type EngineAction, type LessonEngineState } from '../engine/lessonEngine'
import { useTypewriter } from '../hooks/useTypewriter'
import './Whiteboard.css'

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
            <g key={part.name} className={`diagram-part${isRevealed ? ' is-revealed' : ''}${isHighlighted && !isRevealed ? ' is-pending' : ''}`} transform={`translate(${part.x} ${part.y})`}>
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

function ConceptPanel({ states }: { states: LessonEngineState['states'] }) {
  const labels: Record<string, string> = {
    organs: 'Organs',
    fertilisation: 'Fertilisation',
    cleavage: 'Cleavage',
    blastocyst: 'Blastocyst',
    implantation: 'Implantation',
  }
  return (
    <aside className="concept-panel" aria-label="Concept progress">
      <span className="concept-heading">Concepts</span>
      {conceptChain.map((concept) => (
        <span className="concept-item" key={concept}>
          <i className={`concept-dot ${states[concept]}`} aria-hidden="true" />
          {labels[concept]}
        </span>
      ))}
    </aside>
  )
}

function Whiteboard({ onBack }: WhiteboardProps) {
  const [engineState, setEngineState] = useState(() => createInitialState())
  const [revealedParts, setRevealedParts] = useState<string[]>([])
  const [writingStarted, setWritingStarted] = useState(false)
  const [writingRun, setWritingRun] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)
  const [questionVisible, setQuestionVisible] = useState(false)
  const [answer, setAnswer] = useState('')
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null)
  const [engineAction, setEngineAction] = useState<EngineAction | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [speechMessage, setSpeechMessage] = useState('')
  const [completed, setCompleted] = useState(false)
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const boardRef = useRef<HTMLElement>(null)
  const runIdRef = useRef(0)
  const timersRef = useRef<number[]>([])
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const stepIndex = Math.min(engineState.currentStep, lesson.steps.length - 1)
  const step = lesson.steps[stepIndex]
  const { visibleText, done } = useTypewriter(step.write, writingStarted, writingRun)
  const isLastStep = stepIndex === lesson.steps.length - 1
  const pendingAdvance = engineAction === 'advance' || engineAction === 'reveal_and_advance'

  const cancelPlayback = useCallback(() => {
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
    const count = Math.ceil(((sentenceIndex + 1) * targetStep.highlight.length) / splitSentences(targetStep.say).length)
    setRevealedParts(targetStep.highlight.slice(0, count))
  }, [])

  const beginStep = useCallback((targetIndex: number) => {
    if (targetIndex >= lesson.steps.length) {
      cancelPlayback()
      setCompleted(true)
      return
    }
    cancelPlayback()
    const targetStep = lesson.steps[targetIndex]
    const sentences = splitSentences(targetStep.say)
    const runId = runIdRef.current
    setEngineAction(null)
    setGradeResult(null)
    setAnswer('')
    setQuestionVisible(false)
    setSpeechMessage('Starting lesson…')
    setRevealedParts([])
    setWritingStarted(true)
    setWritingRun((run) => run + 1)

    const revealSentence = (index: number) => {
      if (runId === runIdRef.current && index < sentences.length) {
        revealForSentence(targetStep, index)
        setWritingStarted(true)
      }
    }

    const revealRemainingWithoutSpeech = (fromIndex: number) => {
      const revealNext = (index: number) => {
        if (runId !== runIdRef.current || index >= sentences.length) return
        revealSentence(index)
        if (index + 1 < sentences.length) {
          const timer = window.setTimeout(() => revealNext(index + 1), Math.max(700, sentences[index].length * 42))
          timersRef.current.push(timer)
        } else {
          setQuestionVisible(true)
        }
      }
      if (fromIndex < sentences.length) {
        const timer = window.setTimeout(() => revealNext(fromIndex), Math.max(700, sentences[Math.max(0, fromIndex - 1)].length * 42))
        timersRef.current.push(timer)
      } else {
        setQuestionVisible(true)
      }
    }

    // Request speech synchronously inside Play/Continue's click handler so the
    // browser can associate it with the user's gesture.
    if (!speechSupported || isMuted) {
      setSpeechMessage(isMuted ? 'Muted. Showing lesson text.' : 'Speech is not available; showing lesson text.')
      revealSentence(0)
      revealRemainingWithoutSpeech(1)
      return
    }

    const voice = chooseEnglishVoice(window.speechSynthesis.getVoices())
    let speechFailed = false
    const speakSentence = (index: number) => {
      if (runId !== runIdRef.current) return
      if (index >= sentences.length) {
        setQuestionVisible(true)
        setSpeechMessage('Speech finished. Answer the question below.')
        return
      }
      const utterance = new SpeechSynthesisUtterance(sentences[index])
      if (voice) utterance.voice = voice
      utterance.lang = voice?.lang ?? 'en-US'
      activeUtteranceRef.current = utterance
      utterance.onstart = () => {
        if (runId !== runIdRef.current) return
        setSpeechMessage(`Speaking sentence ${index + 1} of ${sentences.length}.`)
        revealSentence(index)
      }
      utterance.onend = () => {
        if (runId === runIdRef.current && !speechFailed) speakSentence(index + 1)
      }
      utterance.onerror = () => {
        if (runId !== runIdRef.current || speechFailed) return
        speechFailed = true
        setSpeechMessage('Speech failed in this browser; continuing with text.')
        revealSentence(index)
        revealRemainingWithoutSpeech(index + 1)
      }
      window.speechSynthesis.speak(utterance)
    }
    speakSentence(0)
  }, [cancelPlayback, isMuted, revealForSentence, speechSupported])

  useEffect(() => {
    const board = boardRef.current
    if (board) board.scrollTo({ top: board.scrollHeight, behavior: 'smooth' })
  }, [stepIndex, visibleText, revealedParts, questionVisible])

  const goBack = () => {
    cancelPlayback()
    onBack()
  }

  const submitAnswer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!questionVisible || !answer.trim()) return
    const attempt = (engineState.attempts[step.id] ?? 0) + 1
    const result = await gradeAnswer({
      stepId: step.id,
      concept: step.concept,
      question: step.check,
      expected: step.expected,
      studentAnswer: answer,
      attempt,
    })
    const output = applyGrade(engineState, step, result)
    setEngineState(output.state)
    setGradeResult(result)
    setEngineAction(output.action)
    setQuestionVisible(output.action === 'followup' || output.action === 'rephrase')

    if (output.action === 'reexplain') {
      // Repeat the concept after the first wrong idea; the engine leaves the step index unchanged.
      beginStep(stepIndex)
      setGradeResult(result)
      setEngineAction(output.action)
    }
  }

  const continueFromEngine = () => {
    if (engineAction !== 'advance' && engineAction !== 'reveal_and_advance') return
    const nextEngineState = engineState
    setEngineAction(null)
    setGradeResult(null)
    if (nextEngineState.currentStep >= lesson.steps.length) {
      cancelPlayback()
      setCompleted(true)
      return
    }
    setEngineState(nextEngineState)
    beginStep(nextEngineState.currentStep)
  }

  const toggleMute = () => {
    const nextMuted = !isMuted
    cancelPlayback()
    setIsMuted(nextMuted)
    setQuestionVisible(false)
    setHasStarted(false)
    setSpeechMessage(nextMuted ? 'Muted. Click Play lesson to show the step text.' : 'Unmuted. Click Play lesson to hear this step.')
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

  if (completed) {
    return (
      <main className="whiteboard-page completion-page">
        <header className="whiteboard-header"><button className="back-button" onClick={goBack}>← Back</button><span className="whiteboard-brand">Chalk<span>AI</span></span><span /></header>
        <section className="completion-card"><h1>Lesson complete</h1><p>You’ve reached the end of this lesson.</p><ConceptPanel states={engineState.states} /><button className="next-button" onClick={goBack}>Return home</button></section>
      </main>
    )
  }

  return (
    <main className="whiteboard-page">
      <header className="whiteboard-header">
        <button className="back-button" onClick={goBack}><span aria-hidden="true">←</span> Back</button>
        <span className="whiteboard-brand">Chalk<span>AI</span></span>
        <span className="step-count">Step {stepIndex + 1} of {lesson.steps.length}</span>
      </header>

      <section className="whiteboard-area" ref={boardRef} aria-label={`${lesson.topic}, step ${stepIndex + 1}`}>
        <ConceptPanel states={engineState.states} />
        <p className="board-label">{lesson.topic}</p>
        <p className="lesson-say">{step.say}</p>
        <LessonDiagram step={step} revealedParts={revealedParts} />
        <div className="written-board" aria-live="polite">
          <p className="written-label">ON THE BOARD</p>
          <p className="lesson-sentence">{visibleText}</p>
        </div>
        {questionVisible && (
          <form className="answer-form" onSubmit={submitAnswer}>
            <label htmlFor="lesson-answer">{step.check}</label>
            <div className="answer-controls">
              <input id="lesson-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Type your answer" autoComplete="off" />
              <button type="submit" disabled={!answer.trim()}>Submit</button>
            </div>
            {gradeResult && <p className={`grade-feedback ${gradeResult.grade}`} role="status">{gradeResult.feedback}{gradeResult.confusedWith ? ` (Related concept: ${gradeResult.confusedWith})` : ''}</p>}
            {pendingAdvance && <button type="button" className="continue-button" onClick={continueFromEngine}>Continue to next step →</button>}
          </form>
        )}
        {!questionVisible && gradeResult && <p className={`grade-feedback ${gradeResult.grade}`} role="status">{gradeResult.feedback}</p>}
      </section>

      <footer className="whiteboard-footer">
        <p className="lesson-status" aria-live="polite">
          {speechMessage || (!hasStarted ? 'Click Play lesson to begin this step.' : done ? 'Answer the question when ready.' : 'Writing this idea on the board…')}
        </p>
        <div className="lesson-navigation">
          <button type="button" className="audio-control" onClick={togglePause} disabled={!speechSupported || isMuted || !hasStarted}>{isPaused ? 'Resume' : 'Pause'}</button>
          <button type="button" className="audio-control" onClick={toggleMute}>{isMuted ? 'Unmute' : 'Mute'}</button>
          {!hasStarted && <button type="button" className="next-button" onClick={() => beginStep(stepIndex)}>Play lesson <span aria-hidden="true">▶</span></button>}
        </div>
      </footer>
    </main>
  )
}

export default Whiteboard
