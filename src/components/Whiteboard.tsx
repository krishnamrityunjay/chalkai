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

type WhiteboardProps = {
  onBack: () => void
}

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
  const [isMuted, setIsMuted] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [speechReady, setSpeechReady] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [speechError, setSpeechError] = useState(false)
  const boardRef = useRef<HTMLElement>(null)
  const runIdRef = useRef(0)
  const fallbackTimersRef = useRef<number[]>([])
  const step = lesson.steps[stepIndex]
  const sentences = splitSentences(step.say)
  const { visibleText, done } = useTypewriter(step.write, writingStarted)
  const isLastStep = stepIndex === lesson.steps.length - 1

  const cancelSpeech = useCallback(() => {
    runIdRef.current += 1
    fallbackTimersRef.current.forEach(window.clearTimeout)
    fallbackTimersRef.current = []
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setIsPaused(false)
  }, [])

  const startBoardAction = useCallback((sentenceIndex: number) => {
    setWritingStarted(true)
    const highlightsToReveal = Math.ceil(((sentenceIndex + 1) * step.highlight.length) / sentences.length)
    setRevealedParts(step.highlight.slice(0, highlightsToReveal))
  }, [sentences.length, step])

  useEffect(() => {
    const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
    setSpeechSupported(supported)
    setSpeechReady(true)
  }, [])

  useEffect(() => {
    setWritingStarted(false)
    setRevealedParts([])
    setSpeechError(false)
    setIsPaused(false)

    if (!speechReady) return

    const runId = ++runIdRef.current
    let sentenceIndex = 0

    const runTextOnly = () => {
      const startNext = () => {
        if (runId !== runIdRef.current || sentenceIndex >= sentences.length) return
        const currentIndex = sentenceIndex
        startBoardAction(currentIndex)
        const duration = Math.max(700, sentences[currentIndex].length * 42)
        sentenceIndex += 1
        if (sentenceIndex < sentences.length) {
          const timer = window.setTimeout(startNext, duration)
          fallbackTimersRef.current.push(timer)
        }
      }
      startNext()
    }

    if (!speechSupported || isMuted) {
      runTextOnly()
      return () => {
        fallbackTimersRef.current.forEach(window.clearTimeout)
        fallbackTimersRef.current = []
        runIdRef.current += 1
      }
    }

    const voices = window.speechSynthesis.getVoices()
    const voice = chooseEnglishVoice(voices)

    const speakSentence = (index: number) => {
      if (runId !== runIdRef.current || index >= sentences.length) {
        setIsPaused(false)
        return
      }
      const utterance = new SpeechSynthesisUtterance(sentences[index])
      if (voice) utterance.voice = voice
      utterance.lang = voice?.lang ?? 'en'
      utterance.onstart = () => {
        if (runId === runIdRef.current) startBoardAction(index)
      }
      utterance.onend = () => {
        if (runId === runIdRef.current) speakSentence(index + 1)
      }
      utterance.onerror = () => {
        if (runId === runIdRef.current) {
          setSpeechError(true)
          speakSentence(index + 1)
        }
      }
      window.speechSynthesis.speak(utterance)
    }

    speakSentence(0)

    return () => {
      runIdRef.current += 1
      window.speechSynthesis.cancel()
    }
  }, [isMuted, sentences, speechReady, speechSupported, startBoardAction])

  useEffect(() => {
    const board = boardRef.current
    if (board) board.scrollTo({ top: board.scrollHeight, behavior: 'smooth' })
  }, [stepIndex, visibleText, revealedParts])

  function goNext() {
    if (!done) return
    cancelSpeech()
    if (isLastStep) {
      onBack()
      return
    }
    setStepIndex((current) => current + 1)
  }

  function goBack() {
    cancelSpeech()
    onBack()
  }

  function togglePause() {
    if (!speechSupported || isMuted) return
    if (isPaused) {
      window.speechSynthesis.resume()
      setIsPaused(false)
    } else {
      window.speechSynthesis.pause()
      setIsPaused(true)
    }
  }

  function toggleMute() {
    cancelSpeech()
    setIsMuted((muted) => !muted)
  }

  return (
    <main className="whiteboard-page">
      <header className="whiteboard-header">
        <button className="back-button" onClick={goBack}>
          <span aria-hidden="true">←</span> Back
        </button>
        <span className="whiteboard-brand">Chalk<span>AI</span></span>
        <span className="step-count">Step {stepIndex + 1} of {lesson.steps.length}</span>
      </header>

      <section className="whiteboard-area" ref={boardRef} aria-label={`${lesson.topic}, step ${stepIndex + 1}`}>
        <div className="lesson-controls" aria-label="Lesson audio controls">
          <button type="button" className="audio-control" onClick={togglePause} disabled={!speechSupported || isMuted}>
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button type="button" className="audio-control" onClick={toggleMute}>
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
          {!speechSupported && <span className="speech-note">Speech isn’t available here; showing text only.</span>}
          {speechError && <span className="speech-note">Speech stopped unexpectedly; the lesson text is still available.</span>}
        </div>
        <p className="board-label">{lesson.topic}</p>
        <p className="lesson-say">{step.say}</p>
        <LessonDiagram step={step} revealedParts={revealedParts} />
        <div className="written-board" aria-live="polite">
          <p className="written-label">ON THE BOARD</p>
          <p className="lesson-sentence">
            {visibleText}<span className="typewriter-cursor" aria-hidden="true">{done ? '' : '|'}</span>
          </p>
        </div>
        <details className="understanding-check">
          <summary>{step.check}</summary>
          <p>Expected answer: <strong>{step.expected}</strong></p>
        </details>
      </section>

      <footer className="whiteboard-footer">
        <p className="lesson-status" aria-live="polite">
          {done ? (isLastStep ? 'You’ve reached the last step.' : 'Ready when you are.') : 'Writing this idea on the board…'}
        </p>
        <div className="lesson-navigation">
          <button type="button" className="audio-control" onClick={togglePause} disabled={!speechSupported || isMuted}>
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button type="button" className="audio-control" onClick={toggleMute}>
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
          <button className="next-button" disabled={!done} onClick={goNext}>
            {isLastStep ? 'Finish' : 'Next'} <span aria-hidden="true">→</span>
          </button>
        </div>
      </footer>
    </main>
  )
}

export default Whiteboard
