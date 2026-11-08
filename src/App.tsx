import { useState } from 'react'
import './App.css'

function ChalkMark() {
  return (
    <span className="chalk-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none">
        <rect x="4" y="5" width="24" height="18" rx="3" />
        <path d="M10 27h12M16 23v4M10 11h8M10 16h5M22 11l-4 6h5l-3 4" />
      </svg>
    </span>
  )
}

function App() {
  const [started, setStarted] = useState(false)

  return (
    <main className="page-shell" id="home">
      <header className="site-header">
        <a className="brand" href="#home" aria-label="ChalkAI home">
          <ChalkMark />
          <span>Chalk<span className="brand-ai">AI</span></span>
        </a>
        <span className="header-note">A calmer way to learn</span>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> YOUR PERSONAL LEARNING SPACE</p>
          <h1 id="hero-title">Big ideas,<br /><span>made clear.</span></h1>
          <p className="hero-description">
            Get a little help understanding the things you’re curious about. Learn at your own pace, one idea at a time.
          </p>
          <button className="start-button" onClick={() => setStarted(true)}>
            <span>Start Learning</span>
            <span className="button-arrow" aria-hidden="true">↗</span>
          </button>
          <p className="button-caption" aria-live="polite">
            {started ? 'Your first lesson is coming soon. No account needed.' : 'Free to start · No account needed'}
          </p>
        </div>

        <aside className="learning-card" aria-label="How ChalkAI helps you learn">
          <div className="card-topline"><span className="card-sparkle" aria-hidden="true">✳</span> A GOOD PLACE TO START</div>
          <p className="card-prompt">Curiosity looks good on you.</p>
          <p className="card-copy">Bring a question. We’ll take it one clear step at a time.</p>
          <div className="card-divider" />
          <div className="learning-points">
            <span><i>01</i> Learn something new</span>
            <span><i>02</i> Check what makes sense</span>
            <span><i>03</i> Try another way</span>
          </div>
          <span className="card-decoration" aria-hidden="true">✳</span>
        </aside>
      </section>

      <footer className="page-footer">
        <span>MADE FOR CURIOUS MINDS.</span>
        <span>Good questions start somewhere.</span>
      </footer>
    </main>
  )
}

export default App
