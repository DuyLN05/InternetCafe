export const pad = (n: number) => String(n).padStart(2, '0')

/** 245000 → "245.000 ₫" */
export const vnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')} ₫`
export const num = (n: number) => Math.round(n).toLocaleString('vi-VN')

/** mili-giây → "02:18:42" */
export function clock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

export const hm = (t: number) => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }
export const hms = (t: number) => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` }
export const dmy = (t: number) => { const d = new Date(t); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` }
export const stamp = (t: number) => `${hm(t)} ${dmy(t)}`

export const initials = (name: string) => name.trim().split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase()

/** Tiền thu theo quy tắc quán: tối thiểu N phút, làm tròn lên phút, tiền làm tròn lên bội số `roundMoney` */
export function calcFee(ms: number, rate: number, minMinutes: number, roundMoney: number) {
  const minutes = Math.max(minMinutes, Math.ceil(ms / 60000))
  const fee = Math.ceil((minutes * rate) / 60 / roundMoney) * roundMoney
  return { minutes, fee }
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const blob = new Blob(['﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase()
