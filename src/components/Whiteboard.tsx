import { useEffect, useRef, useState } from 'react'
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
  const [revealedParts, setRevealedParts] = useState<string[]>([])
  const boardRef = useRef<HTMLElement>(null)
  const step = lesson.steps[stepIndex]
  const { visibleText, done } = useTypewriter(step.write)
  const isLastStep = stepIndex === lesson.steps.length - 1

  useEffect(() => {
    setRevealedParts([])
    const timers = step.highlight.map((part, index) => window.setTimeout(() => {
      setRevealedParts((current) => [...current, part])
    }, 180 * (index + 1)))

    return () => timers.forEach(window.clearTimeout)
  }, [step])

  useEffect(() => {
    const board = boardRef.current
    if (board) board.scrollTo({ top: board.scrollHeight, behavior: 'smooth' })
  }, [stepIndex, visibleText, revealedParts])

  function goNext() {
    if (!done) return
    if (isLastStep) {
      onBack()
      return
    }
    setStepIndex((current) => current + 1)
  }

  return (
    <main className="whiteboard-page">
      <header className="whiteboard-header">
        <button className="back-button" onClick={onBack}>
          <span aria-hidden="true">←</span> Back
        </button>
        <span className="whiteboard-brand">Chalk<span>AI</span></span>
        <span className="step-count">Step {stepIndex + 1} of {lesson.steps.length}</span>
      </header>

      <section className="whiteboard-area" ref={boardRef} aria-label={`${lesson.topic}, step ${stepIndex + 1}`}>
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
        <button className="next-button" disabled={!done} onClick={goNext}>
          {isLastStep ? 'Finish' : 'Next'} <span aria-hidden="true">→</span>
        </button>
      </footer>
    </main>
  )
}

export default Whiteboard
