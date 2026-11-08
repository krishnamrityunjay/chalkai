import { useEffect, useState } from 'react'

export function useTypewriter(text: string, enabled = true, restartToken = 0) {
  const [visibleText, setVisibleText] = useState('')

  useEffect(() => {
    setVisibleText('')
    if (!enabled) return

    let nextIndex = 0
    const timer = window.setInterval(() => {
      nextIndex += 1
      setVisibleText(text.slice(0, nextIndex))
      if (nextIndex >= text.length) window.clearInterval(timer)
    }, 40)

    return () => window.clearInterval(timer)
  }, [enabled, restartToken, text])

  return { visibleText, done: visibleText.length >= text.length }
}
