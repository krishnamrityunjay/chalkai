import { useEffect, useState } from 'react'

export function useTypewriter(text: string) {
  const [visibleText, setVisibleText] = useState('')

  useEffect(() => {
    setVisibleText('')
    let nextIndex = 0
    const timer = window.setInterval(() => {
      nextIndex += 1
      setVisibleText(text.slice(0, nextIndex))
      if (nextIndex >= text.length) {
        window.clearInterval(timer)
      }
    }, 40)

    return () => window.clearInterval(timer)
  }, [text])

  return { visibleText, done: visibleText.length >= text.length }
}
