import { useState } from 'react'
import { useTypewriter } from '../hooks/useTypewriter'
import './Whiteboard.css'

const lessonText = 'Fertilisation happens in the oviduct.'

type WhiteboardProps = {
  onBack: () => void
}

function Whiteboard({ onBack }: WhiteboardProps) {
  const { visibleText, done } = useTypewriter(lessonText)
  const [finished, setFinished] = useState(false)

  return (
    <main className="whiteboard-page">
      <header className="whiteboard-header">
        <button className="back-button" onClick={onBack}>
          <span aria-hidden="true">←</span> Back
        </button>
        <span className="whiteboard-brand">Chalk<span>AI</span></span>
        <span className="step-count">STEP 1 OF 1</span>
      </header>

      <section className="whiteboard-area" aria-label="Lesson whiteboard">
        <p className="board-label">HUMAN REPRODUCTION</p>
        <p className="lesson-sentence" aria-live="polite">
          {visibleText}<span className="typewriter-cursor" aria-hidden="true">{done ? '' : '|'}</span>
        </p>
      </section>

      <footer className="whiteboard-footer">
        <p className="lesson-status" aria-live="polite">
          {finished ? 'That’s the end of this one-step preview.' : 'Take your time. One idea at a time.'}
        </p>
        <button
          className="next-button"
          disabled={!done || finished}
          onClick={() => setFinished(true)}
        >
          {finished ? 'Done' : 'Next'} <span aria-hidden="true">→</span>
        </button>
      </footer>
    </main>
  )
}

export default Whiteboard
