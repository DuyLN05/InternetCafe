import type { State } from './types'

/**
 * Kết nối với API PHP (XAMPP). Không có PHP → mọi hàm trả null và web tự dùng localStorage.
 *  - Chạy bản build trong XAMPP:  htdocs/altf4/dist/index.html  →  ../api/  và  ../data/
 *  - Chạy `npm run dev` (Vite):   proxy /api và /data sang http://localhost/altf4/ (xem vite.config.ts)
 */
const DEV = Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV)
export const API = DEV ? '/api/' : '../api/'
export const DATA = DEV ? '/data/' : '../data/'

const state = { php: false }
export const setBackend = (php: boolean) => { state.php = php }
export const isBackend = () => state.php

/** Đường dẫn ảnh: data URL / http giữ nguyên, còn "uploads/xxx.jpg" → trỏ về thư mục data của máy chủ */
export const imgSrc = (v?: string) => (!v ? v : /^(data:|blob:|https?:|\/)/.test(v) ? v : DATA + v)

async function request(url: string, init?: RequestInit, ms = 4000): Promise<Response | null> {
  const ctl = new AbortController()
  const t = window.setTimeout(() => ctl.abort(), ms)
  try { return await fetch(url, { ...init, signal: ctl.signal, cache: 'no-store' }) } catch { return null } finally { window.clearTimeout(t) }
}

export type RemoteDoc = { rev: number; state?: State; empty?: boolean; unchanged?: boolean }

/** Lấy dữ liệu từ máy chủ. null = không có API PHP (hoặc lỗi mạng) */
export async function fetchState(knownRev?: number): Promise<RemoteDoc | null> {
  const r = await request(`${API}state.php${knownRev !== undefined ? `?rev=${knownRev}` : ''}`)
  if (!r || !r.ok) return null
  try {
    const d = await r.json()
    return typeof d?.rev === 'number' ? (d as RemoteDoc) : null
  } catch { return null }
}

export type PushResult = { ok: true; rev: number } | { conflict: true; rev: number } | null
export async function pushState(rev: number, s: State): Promise<PushResult> {
  const r = await request(`${API}state.php?rev=${rev}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s, null, 1) }, 15000)
  if (!r) return null
  try {
    const d = await r.json()
    if (r.status === 409 && d?.conflict) return { conflict: true, rev: d.rev }
    if (r.ok && d?.ok) return { ok: true, rev: d.rev }
  } catch { /* bỏ qua */ }
  return null
}

/** Tải ảnh (data URL) lên máy chủ → "uploads/xxx.jpg". null nếu thất bại */
export async function uploadImage(dataUrl: string): Promise<string | null> {
  try {
    const blob = await (await fetch(dataUrl)).blob()
    const fd = new FormData()
    fd.append('file', blob, 'image.jpg')
    const r = await request(`${API}upload.php`, { method: 'POST', body: fd }, 20000)
    if (!r || !r.ok) return null
    const d = await r.json()
    return d?.ok && typeof d.name === 'string' ? d.name : null
  } catch { return null }
}
