import { useEffect, useState } from 'react'

export function useTypewriter(text: string, enabled = true, restartToken = 0) {
  const [visibleText, setVisibleText] = useState('')

  useEffect(() => {
    setVisibleText('')
    if (!enabled) return

    let index = 0
    const timer = window.setInterval(() => {
      index += 1
      setVisibleText(text.slice(0, index))
      if (index >= text.length) window.clearInterval(timer)
    }, 40)
    return () => window.clearInterval(timer)
  }, [enabled, restartToken, text])

  return { visibleText, done: visibleText.length >= text.length }
}
