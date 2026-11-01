import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { num, vnd } from '../lib/format'
import { imgSrc } from '../lib/remote'
import type { Result } from '../lib/store'

/* ============================================================
   Icons
   ============================================================ */
const paths: Record<string, ReactNode> = {
  home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h5v-6h4v6h5V10" /></>,
  panel: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m21 16-5-5-9 9" /></>,
  upload: <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" />,
  gamepad: <><rect x="2" y="7" width="20" height="11" rx="5" /><path d="M7 10.5v4M5 12.5h4M15.5 11h.01M18 14h.01" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  monitor: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6M17 11h6" /></>,
  box: <><path d="m21 8-9-5-9 5 9 5 9-5Z" /><path d="m3 8 9 5 9-5M12 13v9" /><path d="m3 8v9l9 5 9-5V8" /></>,
  cart: <><circle cx="9" cy="20" r="1" /><circle cx="19" cy="20" r="1" /><path d="M3 4h2l2.5 11h11l2-7H7" /></>,
  warehouse: <><path d="m3 10 9-7 9 7v11H3V10Z" /><path d="M7 14h10v7M7 17h10" /></>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6" /></>,
  wallet: <><path d="M4 5h15a2 2 0 0 1 2 2v11H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /><path d="M16 10h5v5h-5a2.5 2.5 0 0 1 0-5Z" /></>,
  wrench: <path d="M14.7 6.3a4 4 0 0 0-5-5l2.1 2.1-2.4 2.4-2.1-2.1a4 4 0 0 0 5 5L20 16.4 16.4 20l-7.7-7.7" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  staff: <><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0M17 8h5M19.5 5.5v5" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V3h4v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
  log: <path d="M5 3h14v18H5zM9 8h6M9 12h6M9 16h4" />,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  arrow: <path d="m9 18 6-6-6-6" />,
  bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />,
  shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-5" /></>,
  logout: <path d="M10 17l5-5-5-5M15 12H3M14 3h7v18h-7" />,
  check: <path d="m5 12 4 4L19 6" />,
  alert: <><path d="M12 3 2 21h20L12 3Z" /><path d="M12 9v5M12 18h.01" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  printer: <><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v7H6z" /></>,
  download: <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
  menu: <path d="M4 6h16M4 12h16M4 18h10" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  eyeoff: <><path d="M17.9 17.9A10 10 0 0 1 12 19c-6.5 0-10-7-10-7a17 17 0 0 1 4.1-4.9M9.9 5.2A9 9 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.2 3.2M1 1l22 22" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  swap: <path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />,
  coin: <><circle cx="12" cy="12" r="9" /><path d="M14.8 9a3 3 0 0 0-2.8-1.5c-1.7 0-3 .9-3 2.2s1.3 1.8 3 2.1 3 .8 3 2.2-1.3 2.2-3 2.2A3 3 0 0 1 9 14.7M12 6v1.5M12 16.5V18" /></>,
  zap: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
  command: <path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6Z" />,
  trend: <path d="m3 17 6-6 4 4 8-8M15 7h6v6" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  key: <><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M16 7l3 3" /></>,
  undo: <path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />,
}

export function Icon({ name, size = 18, stroke = 1.8 }: { name: string; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

/* ============================================================
   Button / Badge
   ============================================================ */
export function Logo({ lg }: { lg?: boolean }) {
  return (
    <div className={`brand-mark keycap-mark${lg ? ' lg' : ''}`} aria-hidden="true">
      <small>ALT</small><b>F4</b>
    </div>
  )
}

/** Ảnh sản phẩm: ảnh tải lên, hoặc tranh minh họa mặc định theo tên/danh mục */
const ART: [RegExp, string][] = [
  [/cà phê|cafe|coffee/i, '☕'], [/trà|tea/i, '🧋'], [/nước suối|aquafina|lavie|nước lọc/i, '💧'], [/sting|coca|pepsi|7up|nước ngọt|bò húc|redbull|number/i, '🥤'],
  [/bánh mì|sandwich/i, '🥖'], [/mì|phở|bún|hủ tiếu/i, '🍜'], [/cơm/i, '🍚'], [/khoai|snack|bim/i, '🍟'], [/xúc xích|hot ?dog/i, '🌭'], [/pizza/i, '🍕'],
  [/tai nghe|headset/i, '🎧'], [/chuột|mouse/i, '🖱️'], [/bàn phím|keyboard/i, '⌨️'], [/thẻ|card|garena|steam/i, '💳'],
]
export function productEmoji(name: string, cat: string) {
  return ART.find(([re]) => re.test(name))?.[1] ?? (cat === 'Nước giải khát' ? '🥤' : cat === 'Đồ ăn' ? '🍽️' : '🎮')
}
const ART_TONE: Record<string, string> = { 'Nước giải khát': '0, 229, 255', 'Đồ ăn': '255, 171, 0', 'Thẻ & phụ kiện': '168, 85, 247' }
export function ProductArt({ name, cat, image, className = '' }: { name: string; cat: string; image?: string; className?: string }) {
  return image
    ? <div className={`p-art has-img ${className}`}><img src={imgSrc(image)} alt={name} loading="lazy" draggable={false} /></div>
    : <div className={`p-art ${className}`} style={{ ['--tone' as string]: ART_TONE[cat] ?? '0, 229, 255' }} role="img" aria-label={name}><span>{productEmoji(name, cat)}</span></div>
}

/** Vệt sét theo con trỏ: rê chuột trên màn hình để lại tia sét mờ dần */
export function LightningTrail() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv || (typeof matchMedia !== 'undefined' && (matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(pointer: fine)').matches))) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    type Seg = { pts: [number, number][]; born: number; w: number }
    let segs: Seg[] = []
    let raf = 0, last: [number, number] | null = null, dpr = 1
    const LIFE = 520
    const resize = () => { dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0) }
    resize()
    const jag = (x0: number, y0: number, x1: number, y1: number, amp: number): [number, number][] => {
      const n = Math.max(3, Math.min(9, Math.round(Math.hypot(x1 - x0, y1 - y0) / 14)))
      const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len
      const out: [number, number][] = [[x0, y0]]
      for (let i = 1; i < n; i++) { const o = (Math.random() - 0.5) * 2 * amp; out.push([x0 + (dx * i) / n + nx * o, y0 + (dy * i) / n + ny * o]) }
      out.push([x1, y1])
      return out
    }
    const colors = () => {
      const cs = getComputedStyle(document.documentElement)
      const light = document.documentElement.getAttribute('data-theme') === 'light'
      return { glow: cs.getPropertyValue(light ? '--purple' : '--cyan').trim() || '#00e5ff', core: light ? (cs.getPropertyValue('--cyan').trim() || '#00b8d4') : '#ffffff' }
    }
    let col = colors()
    const draw = (now: number) => {
      ctx.clearRect(0, 0, innerWidth, innerHeight)
      segs = segs.filter((s) => now - s.born < LIFE)
      for (const s of segs) {
        const a = 1 - (now - s.born) / LIFE
        const flick = 0.75 + Math.random() * 0.25
        ctx.globalAlpha = a * flick
        ctx.lineJoin = 'round'; ctx.lineCap = 'round'
        ctx.beginPath(); s.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
        ctx.strokeStyle = col.glow; ctx.shadowColor = col.glow; ctx.shadowBlur = 14; ctx.lineWidth = s.w * 3; ctx.stroke()
        ctx.shadowBlur = 0; ctx.strokeStyle = col.core; ctx.lineWidth = s.w; ctx.stroke()
      }
      ctx.globalAlpha = 1
      raf = segs.length ? requestAnimationFrame(draw) : 0
    }
    const push = (s: Seg) => { segs.push(s); if (segs.length > 60) segs.shift(); if (!raf) raf = requestAnimationFrame(draw) }
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const p: [number, number] = [e.clientX, e.clientY]
      if (!last) { last = p; return }
      const d = Math.hypot(p[0] - last[0], p[1] - last[1])
      if (d < 12) return
      const now = performance.now()
      if (segs.length === 0) col = colors()
      push({ pts: jag(last[0], last[1], p[0], p[1], Math.min(16, 4 + d / 5)), born: now, w: 1.4 })
      if (Math.random() < 0.28) { const a = jag(p[0], p[1], p[0] + (Math.random() - 0.5) * 70, p[1] + (Math.random() - 0.5) * 70, 8); push({ pts: a, born: now, w: 1 }) }
      last = p
    }
    const leave = () => { last = null }
    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerleave', leave)
    window.addEventListener('resize', resize)
    return () => { window.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', leave); window.removeEventListener('resize', resize); cancelAnimationFrame(raf) }
  }, [])
  return <canvas ref={ref} className="lightning-canvas" aria-hidden="true" />
}

/** Màn hình loading: vòng xoay + chữ nhảy (tối ưu: chỉ animate transform/opacity) */
export function Loader({ text = 'ALTF4', caption = 'ĐANG ĐỒNG BỘ DỮ LIỆU…', out }: { text?: string; caption?: string; out?: boolean }) {
  return (
    <div className={`loader-screen ${out ? 'out' : ''}`} role="status" aria-live="polite" aria-label={caption}>
      <div className="loader-wrapper">
        {text.split('').map((c, i) => <span key={i} className="loader-letter" aria-hidden="true">{c}</span>)}
        <div className="loader" />
      </div>
      <small className="loader-caption">{caption}</small>
    </div>
  )
}

export function Button({ children, tone = 'primary', icon, onClick, disabled, loading, size, block, type = 'button', title }: {
  children?: ReactNode; tone?: 'primary' | 'secondary' | 'ghost' | 'danger'; icon?: string
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; disabled?: boolean; loading?: boolean
  size?: 'sm'; block?: boolean; type?: 'button' | 'submit'; title?: string
}) {
  return (
    <button type={type} title={title} className={`btn btn-${tone} ${size === 'sm' ? 'btn-sm' : ''} ${block ? 'btn-block' : ''}`} onClick={onClick} disabled={disabled || loading}>
      {loading ? <span className="spinner" /> : icon && <Icon name={icon} size={size === 'sm' ? 14 : 16} />}
      {children && <span>{children}</span>}
    </button>
  )
}

export function Badge({ children, tone = 'cyan' }: { children: ReactNode; tone?: string }) {
  return <span className={`badge badge-${tone}`}><span className="status-dot" />{children}</span>
}

/* ============================================================
   Form fields
   ============================================================ */
interface FieldShell { label?: string; error?: string; hint?: string; children: ReactNode; className?: string }
function Shell({ label, error, hint, children, className = '' }: FieldShell) {
  return (
    <label className="field-wrap">
      {label && <span className="field-label">{label}</span>}
      <span className={`field ${className} ${error ? 'error' : ''}`}>{children}</span>
      {error ? <span className="error-copy"><Icon name="alert" size={13} />{error}</span> : hint ? <span className="hint-copy">{hint}</span> : null}
    </label>
  )
}

export function TextField({ label, icon, error, hint, suffix, value, onChange, type = 'text', placeholder, autoFocus, disabled, onEnter, name, autoComplete }: {
  label?: string; icon?: string; error?: string; hint?: string; suffix?: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string; autoFocus?: boolean; disabled?: boolean; onEnter?: () => void; name?: string; autoComplete?: string
}) {
  const [show, setShow] = useState(false)
  const isPw = type === 'password'
  return (
    <Shell label={label} error={error} hint={hint}>
      {icon && <Icon name={icon} size={16} />}
      <input name={name} autoComplete={autoComplete} type={isPw && show ? 'text' : type} value={value} placeholder={placeholder} autoFocus={autoFocus} disabled={disabled}
        onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onEnter?.()} />
      {suffix && <span className="suffix">{suffix}</span>}
      {isPw && <button type="button" className="field-btn" aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={(e) => { e.preventDefault(); setShow(!show) }}><Icon name={show ? 'eyeoff' : 'eye'} size={16} /></button>}
    </Shell>
  )
}

/** Nhập tiền / số: hiển thị có dấu chấm ngăn cách nghìn */
export function NumberField({ label, icon, error, hint, suffix, value, onChange, placeholder, autoFocus }: {
  label?: string; icon?: string; error?: string; hint?: string; suffix?: string; value: number | null; onChange: (v: number | null) => void; placeholder?: string; autoFocus?: boolean
}) {
  return (
    <Shell label={label} error={error} hint={hint}>
      {icon && <Icon name={icon} size={16} />}
      <input inputMode="numeric" autoFocus={autoFocus} placeholder={placeholder} value={value === null ? '' : num(value)}
        onChange={(e) => { const d = e.target.value.replace(/\D/g, ''); onChange(d ? parseInt(d, 10) : null) }} />
      {suffix && <span className="suffix">{suffix}</span>}
    </Shell>
  )
}

export function SelectField({ label, icon, value, onChange, options, error, hint }: {
  label?: string; icon?: string; value: string; onChange: (v: string) => void; options: { value: string; label: string; disabled?: boolean }[]; error?: string; hint?: string
}) {
  return (
    <Shell label={label} error={error} hint={hint} className="select">
      {icon && <Icon name={icon} size={16} />}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
      </select>
    </Shell>
  )
}

export function TextArea({ label, value, onChange, placeholder, error }: { label?: string; value: string; onChange: (v: string) => void; placeholder?: string; error?: string }) {
  return (
    <Shell label={label} error={error} className="area">
      <textarea value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </Shell>
  )
}

export function SearchBox({ value, onChange, placeholder, wide }: { value: string; onChange: (v: string) => void; placeholder: string; wide?: boolean }) {
  return (
    <label className={`search ${wide ? 'wide' : ''}`}>
      <Icon name="search" size={16} />
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

/* ============================================================
   Tabs / Chip
   ============================================================ */
export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="tabs" role="tablist">
      {items.map((i) => (
        <button key={i.value} role="tab" aria-selected={value === i.value} className={`tab ${value === i.value ? 'active' : ''}`} onClick={() => onChange(i.value)}>
          {i.label}{i.count !== undefined && <b>{i.count}</b>}
        </button>
      ))}
    </div>
  )
}

/* ============================================================
   Layout helpers
   ============================================================ */
export function PageHead({ eyebrow, title, sub, actions }: { eyebrow: string; title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div><span className="eyebrow cyan">{eyebrow}</span><h1 className="title glitch" data-text={title}>{title}</h1>{sub && <p className="page-sub">{sub}</p>}</div>
      {actions}
    </div>
  )
}

export function CountUp({ value, format = num, duration = 1000 }: { value: number; format?: (n: number) => string; duration?: number }) {
  const [v, setV] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setV(value); from.current = value; return }
    const a = from.current
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      const cur = a + (value - a) * (1 - Math.pow(1 - p, 4))
      from.current = cur
      setV(p === 1 ? value : cur)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return <>{format(v)}</>
}

export function Stat({ label, value, money, text, meta, metaTone, icon, tone = 'cyan', pad2 }: {
  label: string; value?: number; money?: boolean; text?: string; meta?: string; metaTone?: 'up' | 'down'; icon: string; tone?: string; pad2?: boolean
}) {
  const fmt = money ? vnd : pad2 ? (n: number) => String(Math.round(n)).padStart(2, '0') : num
  return (
    <div className={`stat stat-${tone}`}>
      <div className="stat-icon"><Icon name={icon} size={20} /></div>
      <div>
        <span className="stat-label">{label}</span>
        <strong className="stat-value">{value !== undefined ? <CountUp value={value} format={fmt} /> : text}</strong>
        {meta && <span className={`stat-meta ${metaTone ?? ''}`}>{meta}</span>}
      </div>
    </div>
  )
}

export function EmptyState({ title = 'Chưa có dữ liệu', hint = 'Thử thay đổi bộ lọc hoặc tạo bản ghi mới.' }: { title?: string; hint?: string }) {
  return <div className="empty-state"><div><Icon name="search" size={28} /></div><strong>{title}</strong><span>{hint}</span></div>
}

export function AccessDenied() {
  return (
    <div className="access-denied">
      <div><Icon name="lock" size={34} /></div>
      <span className="eyebrow">Mã lỗi · 403</span>
      <h1 className="title">Không có quyền truy cập</h1>
      <p>Vai trò hiện tại không có quyền xem chức năng này. Liên hệ Quản trị viên nếu bạn cần được cấp quyền.</p>
    </div>
  )
}

/* ============================================================
   DataTable (phân trang + hiệu ứng hàng)
   ============================================================ */
export interface Col<T> { head: string; cell: (r: T, i: number) => ReactNode; className?: string; right?: boolean }

export function DataTable<T>({ cols, rows, rowKey, pageSize = 8, empty }: { cols: Col<T>[]; rows: T[]; rowKey: (r: T) => string; pageSize?: number; empty?: ReactNode }) {
  const [page, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  const cur = Math.min(page, pages)
  const slice = rows.slice((cur - 1) * pageSize, cur * pageSize)
  if (!rows.length) return <>{empty ?? <EmptyState />}</>
  return (
    <>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr>{cols.map((c) => <th key={c.head} className={c.right ? 'right' : ''}>{c.head}</th>)}</tr></thead>
          <tbody key={cur}>
            {slice.map((r, i) => (
              <tr key={rowKey(r)} style={{ ['--i' as string]: i }}>
                {cols.map((c) => <td key={c.head} className={`${c.className ?? ''} ${c.right ? 'right' : ''}`}>{c.cell(r, i)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        <span>Hiển thị {(cur - 1) * pageSize + 1}–{Math.min(cur * pageSize, rows.length)} trong {rows.length} kết quả</span>
        {pages > 1 && (
          <div className="pager">
            <button disabled={cur === 1} onClick={() => setPage(cur - 1)} aria-label="Trang trước">‹</button>
            {Array.from({ length: pages }, (_, i) => <button key={i} className={cur === i + 1 ? 'active' : ''} onClick={() => setPage(i + 1)}>{i + 1}</button>)}
            <button disabled={cur === pages} onClick={() => setPage(cur + 1)} aria-label="Trang sau">›</button>
          </div>
        )}
      </div>
    </>
  )
}

/* ============================================================
   Modal (portal + animation đóng/mở + Esc + khóa cuộn)
   ============================================================ */
export function Modal({ eyebrow, title, onClose, children, footer, size, steps }: {
  eyebrow: string; title: string; onClose: () => void; children: ReactNode
  footer?: (close: () => void) => ReactNode; size?: 'sm' | 'lg'; steps?: { label: string; state: 'done' | 'active' | '' }[]
}) {
  const [closing, setClosing] = useState(false)
  const close = useCallback(() => {
    setClosing((c) => { if (!c) window.setTimeout(onClose, 190); return true })
  }, [onClose])
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', k)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev }
  }, [close])
  return createPortal(
    <div className={`modal-backdrop ${closing ? 'closing' : ''}`} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className={`modal ${size ?? ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div><span className="eyebrow cyan">{eyebrow}</span><div className="modal-title">{title}</div></div>
          <button className="modal-close" onClick={close} aria-label="Đóng"><Icon name="x" size={16} /></button>
        </div>
        {steps && (
          <div className="stepper">
            {steps.flatMap((s, i) => [
              i > 0 && <b key={`b${i}`} />,
              <div key={s.label} className={s.state}><i>{s.state === 'done' ? <Icon name="check" size={12} /> : i + 1}</i><span>{s.label}</span></div>,
            ])}
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer(close)}</div>}
      </div>
    </div>,
    document.body,
  )
}

/* ============================================================
   Toast
   ============================================================ */
type Tone = 'success' | 'error' | 'warn' | 'info'
interface ToastItem { id: number; tone: Tone; title: string; msg: string; out?: boolean }
interface ToastApi { (r: Result): void; show: (tone: Tone, title: string, msg: string) => void }
const ToastCtx = createContext<ToastApi>(Object.assign(() => {}, { show: () => {} }))
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)
  const show = useCallback((tone: Tone, title: string, msg: string) => {
    const id = ++seq.current
    setItems((x) => [...x.slice(-3), { id, tone, title, msg }])
    window.setTimeout(() => setItems((x) => x.map((t) => (t.id === id ? { ...t, out: true } : t))), 3600)
    window.setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 3900)
  }, [])
  const api = useRef(Object.assign((r: Result) => show(r.ok ? 'success' : 'error', r.ok ? 'Thao tác thành công' : 'Không thể thực hiện', r.msg), { show })).current
  return (
    <ToastCtx.Provider value={api}>
      {children}
      {createPortal(
        <div className="toast-stack" role="status" aria-live="polite">
          {items.map((t) => (
            <div key={t.id} className={`toast ${t.tone} ${t.out ? 'out' : ''}`}>
              <div className="toast-icon"><Icon name={t.tone === 'success' ? 'check' : t.tone === 'info' ? 'info' : 'alert'} /></div>
              <div><strong>{t.title}</strong><span>{t.msg}</span></div>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastCtx.Provider>
  )
}

/* ============================================================
   Popover (menu thả xuống: đóng khi click ngoài / Esc)
   ============================================================ */
export function usePopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', down)
    window.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', down); window.removeEventListener('keydown', key) }
  }, [open])
  return { open, setOpen, ref }
}

/* ============================================================
   Hiệu ứng toàn cục: ripple khi click + spotlight theo con trỏ
   ============================================================ */
const RIPPLE_SEL = '.btn, .nav-item, .tab, .chip, .icon-btn, .choice, .pay-option, .menu-item, .machine-card, .palette-item, .notif, .alert-item'
export function useGlobalEffects() {
  useEffect(() => {
    const down = (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>(RIPPLE_SEL)
      if (!el || (el as HTMLButtonElement).disabled) return
      const r = el.getBoundingClientRect()
      const size = Math.max(r.width, r.height) * 0.9
      const s = document.createElement('span')
      s.className = 'ripple'
      s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`
      el.appendChild(s)
      window.setTimeout(() => s.remove(), 700)
    }
    const move = (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('.spot')
      if (!el) return
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${e.clientX - r.left}px`)
      el.style.setProperty('--my', `${e.clientY - r.top}px`)
    }
    document.addEventListener('pointerdown', down)
    document.addEventListener('pointermove', move, { passive: true })
    return () => { document.removeEventListener('pointerdown', down); document.removeEventListener('pointermove', move) }
  }, [])
}
