import { useCallback, useEffect, useRef, useState } from 'react'
import lesson from '../lesson.json'
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

function chooseEnglishVoice(voices: SpeechSynthesisVoice[]) {
  return voices.find((voice) => voice.lang.toLowerCase().startsWith('en-in'))
    ?? voices.find((voice) => voice.lang.toLowerCase().startsWith('en-gb'))
    ?? voices.find((voice) => voice.lang.toLowerCase().startsWith('en'))
}

function Whiteboard({ onBack }: WhiteboardProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [revealedParts, setRevealedParts] = useState<string[]>([])
  const [writingStarted, setWritingStarted] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [speechError, setSpeechError] = useState(false)
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
    let sentenceIndex = 0

    setStepIndex(targetIndex)
    setHasStarted(true)
    setSpeechError(false)
    setRevealedParts([])
    setWritingStarted(true)

    const revealSentence = (index: number) => {
      if (runId === runIdRef.current && index < sentences.length) {
        sentenceIndex = index
        revealForSentence(targetStep, index)
      }
    }

    // Start the first visual action directly in the button gesture. Mobile browsers
    // may block speech started later from a React effect without user activation.
    revealSentence(0)

    const continueTextOnly = (fromIndex: number) => {
      const revealNext = (index: number) => {
        if (runId !== runIdRef.current || index >= sentences.length) return
        revealSentence(index)
        if (index + 1 < sentences.length) {
          const delay = Math.max(700, sentences[index].length * 42)
          timersRef.current.push(window.setTimeout(() => revealNext(index + 1), delay))
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
      if (runId !== runIdRef.current || index >= sentences.length) return
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
  }, [stepIndex, visibleText, revealedParts])

  const goBack = () => {
    clearPlayback()
    onBack()
  }

  const goNext = () => {
    if (!done) return
    if (isLastStep) {
      clearPlayback()
      onBack()
    } else {
      // This click is a user gesture, so it can start mobile speech reliably.
      beginStep(stepIndex + 1)
    }
  }

  const toggleMute = () => {
    const nextMuted = !isMuted
    clearPlayback()
    setIsMuted(nextMuted)
    if (nextMuted && hasStarted) {
      // Keep the board useful when muted: finish revealing the current step.
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
        <details className="understanding-check">
          <summary>{step.check}</summary>
          <p>Expected answer: <strong>{step.expected}</strong></p>
        </details>
      </section>

      <footer className="whiteboard-footer">
        <p className="lesson-status" aria-live="polite">
          {!hasStarted ? 'Tap play to begin this step.' : speechError ? 'Speech was blocked; lesson text is shown.' : done ? (isLastStep ? 'You’ve reached the last step.' : 'Ready when you are.') : 'Writing this idea on the board…'}
          {!speechSupported && hasStarted ? ' Speech is unavailable in this browser.' : ''}
        </p>
        <div className="lesson-navigation">
          <button type="button" className="audio-control" onClick={togglePause} disabled={!speechSupported || isMuted || !hasStarted}>
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button type="button" className="audio-control" onClick={toggleMute}>{isMuted ? 'Unmute' : 'Mute'}</button>
          {!hasStarted ? (
            <button type="button" className="next-button" onClick={() => beginStep(stepIndex)}>Play lesson <span aria-hidden="true">▶</span></button>
          ) : (
            <button className="next-button" disabled={!done} onClick={goNext}>
              {isLastStep ? 'Finish' : 'Next'} <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
      </footer>
    </main>
  )
}

export default Whiteboard
