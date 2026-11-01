import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'

export type Theme = 'dark' | 'light'
interface ThemeCtx { theme: Theme; setTheme: (t: Theme, origin?: { x: number; y: number }) => void; toggle: (origin?: { x: number; y: number }) => void }
const Ctx = createContext<ThemeCtx>({ theme: 'dark', setTheme: () => {}, toggle: () => {} })
export const useTheme = () => useContext(Ctx)

const KEY = 'nx-theme'

function initial(): Theme {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* private mode */ }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

type VTDocument = Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } }

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initial)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem(KEY, theme) } catch { /* ignore */ }
  }, [theme])

  const setTheme = useCallback((next: Theme, origin?: { x: number; y: number }) => {
    const root = document.documentElement
    const apply = () => {
      flushSync(() => setThemeState(next))
      root.dataset.theme = next
    }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const doc = document as VTDocument
    if (!doc.startViewTransition || reduce) { apply(); return }

    // Vòng tròn loang ra từ chính nút người dùng vừa bấm
    const x = origin?.x ?? window.innerWidth / 2
    const y = origin?.y ?? 0
    const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
    const t = doc.startViewTransition(apply)
    t.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 700, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
      )
    }).catch(() => {})
  }, [])

  const toggle = useCallback((origin?: { x: number; y: number }) => setTheme(theme === 'dark' ? 'light' : 'dark', origin), [theme, setTheme])

  return <Ctx.Provider value={{ theme, setTheme, toggle }}>{children}</Ctx.Provider>
}
