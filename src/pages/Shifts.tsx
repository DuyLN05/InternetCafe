import { useState } from 'react'
import { Badge, Button, DataTable, NumberField, PageHead, Stat, useToast, type Col } from '../components/ui'
import { clock, hms, stamp, vnd } from '../lib/format'
import { shiftTotals, useNow, useStore } from '../lib/store'
import type { Shift } from '../lib/types'

export default function Shifts() {
  const { state, act } = useStore()
  const toast = useToast()
  const now = useNow()
  const sh = state.shift
  const t = shiftTotals(state)
  const [counted, setCounted] = useState<number | null>(null)
  const [openCash, setOpenCash] = useState<number | null>(1000000)
  const diff = counted === null ? null : counted - t.expected
  const open = sh.status === 'open'

  const cols: Col<Shift>[] = [
    { head: 'Ca', cell: (s) => s.id, className: 'code' },
    { head: 'Nhân viên', cell: (s) => s.user, className: 'strong' },
    { head: 'Mở ca', cell: (s) => stamp(s.openAt) },
    { head: 'Kết ca', cell: (s) => (s.closeAt ? stamp(s.closeAt) : '—') },
    { head: 'Tiền đầu ca', cell: (s) => <span className="num">{vnd(s.openCash)}</span>, right: true },
    { head: 'Hệ thống', cell: (s) => <span className="num">{s.expected !== undefined ? vnd(s.expected) : '—'}</span>, right: true },
    { head: 'Thực tế', cell: (s) => <span className="num">{s.counted !== undefined ? vnd(s.counted) : '—'}</span>, right: true },
    { head: 'Chênh lệch', cell: (s) => s.counted === undefined || s.expected === undefined ? '—' : <Badge tone={s.counted === s.expected ? 'empty' : 'danger'}>{vnd(s.counted - s.expected)}</Badge> },
  ]

  return (
    <>
      <PageHead eyebrow="Ca của tôi" title="Ca làm việc" actions={open ? <Badge tone="using">Đang mở · {clock(now - sh.openAt)}</Badge> : <Badge tone="muted">Chưa có ca mở</Badge>} />

      <div className="shift-hero">
        <div>
          <span className="eyebrow cyan">{sh.id} · {open ? 'Đang hoạt động' : 'Đã kết ca'}</span>
          <div className="shift-time">{hms(sh.openAt).slice(0, 5)} — {open ? 'Đang hoạt động' : hms(sh.closeAt ?? sh.openAt).slice(0, 5)}</div>
          <small>Mở bởi {sh.user} lúc {hms(sh.openAt)}</small>
        </div>
        <div className="shift-cash"><small>TIỀN MẶT ĐẦU CA</small><strong className="num">{vnd(sh.openCash)}</strong></div>
      </div>

      <div className="stats-row">
        <Stat label="Tiền mặt" value={t.cash} money meta={`${t.cashCount} giao dịch + nạp ví`} icon="wallet" tone="green" />
        <Stat label="Chuyển khoản" value={t.transfer} money meta="Nhân viên xác nhận thủ công" icon="receipt" />
        <Stat label="Trừ số dư" value={t.wallet} money meta={`${t.walletCount} giao dịch`} icon="users" tone="magenta" />
      </div>

      {open ? (
        <div className="card">
          <div className="card-head"><div><span className="eyebrow">Đối chiếu cuối ca</span><strong>Kết ca & đối chiếu</strong></div></div>
          <div className="reconcile-grid">
            <div className="field-wrap"><span className="field-label">Tiền mặt hệ thống</span><div className="field" style={{ fontWeight: 600 }}><span className="num">{vnd(t.expected)}</span></div></div>
            <NumberField label="Tiền mặt thực tế" suffix="₫" value={counted} onChange={setCounted} placeholder="Nhập số tiền kiểm đếm" />
            <div className={`difference ${diff === null ? '' : diff === 0 ? 'ok' : 'bad'}`}><span>CHÊNH LỆCH</span><strong className="num">{diff === null ? '—' : `${diff > 0 ? '+' : ''}${vnd(diff)}`}</strong></div>
          </div>
          <div className="align-right"><Button tone="secondary" disabled={counted === null} onClick={() => toast(act.closeShift(counted ?? 0))}>Kết ca</Button></div>
        </div>
      ) : (
        <div className="card">
          <div className="card-head"><div><span className="eyebrow">Ca mới</span><strong>Mở ca làm việc</strong></div></div>
          <div className="form-grid"><NumberField label="Tiền mặt đầu ca" suffix="₫" value={openCash} onChange={setOpenCash} /><div style={{ alignSelf: 'end' }}><Button onClick={() => toast(act.openShift(openCash ?? 0))}>Mở ca</Button></div></div>
        </div>
      )}

      <div className="card card-flush">
        <div className="card-head"><div><span className="eyebrow">Lịch sử</span><strong>Các ca gần đây</strong></div></div>
        <DataTable cols={cols} rows={state.shifts} rowKey={(s) => s.id} pageSize={5} />
      </div>
    </>
  )
}
