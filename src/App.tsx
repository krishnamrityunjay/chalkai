import { useState } from 'react'
import './App.css'

function ChalkMark() {
  return (
    <span className="chalk-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none">
        <rect x="3" y="4" width="26" height="19" rx="3" />
        <path d="M9 28h14M16 23v5M9 11h9M9 16h6M22 10l-4 7h5l-3 5" />
      </svg>
    </span>
  )
}

function BoardPreview() {
  return (
    <div className="board-wrap" aria-label="A preview of a lesson about fertilisation">
      <div className="board-topline">
        <span className="live-dot" />
        <span>YOUR LESSON, ON THE BOARD</span>
        <span className="board-step">01 / 04</span>
      </div>
      <div className="board-content">
        <p className="board-kicker">HUMAN REPRODUCTION</p>
        <h2>Where does<br />fertilisation happen?</h2>
        <div className="diagram" aria-hidden="true">
          <svg viewBox="0 0 360 142" fill="none">
            <path className="anatomy-line" d="M160 57c-17-23-44-31-68-24-14 4-24 13-34 25M200 57c17-23 44-31 68-24 14 4 24 13 34 25" />
            <path className="anatomy-line" d="M127 53c-7 11-11 24-11 38 0 22 17 38 44 38 27 0 44-16 44-38 0-14-4-27-11-38" />
            <path className="anatomy-line" d="M160 58c-12 13-13 30-7 43 4 8 11 13 27 13s23-5 27-13c6-13 5-30-7-43" />
            <circle className="ovum" cx="100" cy="41" r="5" />
            <path className="highlight-path" d="M74 34c19-20 46-26 71-15" />
            <path className="leader" d="M87 35 50 14H20" />
            <text x="14" y="10" className="label">OVIDUCT</text>
            <path className="leader" d="M181 119v15h42" />
            <text x="227" y="138" className="label">UTERUS</text>
          </svg>
          <span className="diagram-note"><span className="note-dot" /> Look here first</span>
        </div>
        <div className="board-question">
          <span className="question-icon">?</span>
          <span>Quick check: Where does the egg meet the sperm?</span>
        </div>
      </div>
      <div className="board-footer">
        <span><span className="sound-bars"><i /><i /><i /><i /></span> SPEAKING</span>
        <span>Listen · Watch · Do</span>
      </div>
    </div>
  )
}

function App() {
  const [started, setStarted] = useState(false)

  return (
    <main className="page-shell">
      <header className="site-header">
        <a className="brand" href="#home" aria-label="ChalkAI home">
          <ChalkMark />
          <span>chalk<span className="brand-ai">ai</span></span>
        </a>
        <span className="header-note"><span className="sparkle">✳</span> A little more like a real teacher</span>
      </header>

      <section className="hero" id="home">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> YOUR FREE, PERSONAL AI TEACHER</div>
          <h1>Learn it.<br /><span>See it.</span> Know it.</h1>
          <p className="hero-description">
            A teacher that draws it out, asks if it makes sense, and explains it another way when it doesn’t.
          </p>
          <button className="start-button" onClick={() => setStarted(true)}>
            <span>{started ? 'You’re on the list!' : 'Start Learning'}</span>
            <span className="button-arrow" aria-hidden="true">↗</span>
          </button>
          <p className="button-caption" aria-live="polite">
            {started ? 'Your first lesson is coming soon. Stay curious!' : 'Free to start · No account needed'}
          </p>
          <div className="trust-row">
            <div className="avatar-stack" aria-hidden="true"><span>✦</span><span>✎</span><span>♡</span></div>
            <span>Made for curious minds<br /><strong>and the questions that get you stuck.</strong></span>
          </div>
        </div>

        <div className="hero-art">
          <div className="art-scribble scribble-one" aria-hidden="true">✳</div>
          <div className="art-scribble scribble-two" aria-hidden="true">↗</div>
          <BoardPreview />
          <div className="floating-note note-understood"><span>✓</span> Got it!</div>
          <div className="floating-note note-adapt"><span>↻</span> Let’s try another way</div>
        </div>
      </section>

      <footer className="page-footer">
        <span>GOOD QUESTIONS MAKE GREAT LEARNERS.</span>
        <span>Designed for your next “oh, I get it.” <span className="footer-star">✳</span></span>
      </footer>
    </main>
  )
}

export default App
