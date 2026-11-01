import { useMemo, useState } from 'react'
import { CheckoutModal, NewOrderModal, OpenSessionModal } from '../components/modals'
import { Badge, Button, Icon, Modal, PageHead, SearchBox, SelectField, Stat, Tabs, useToast } from '../components/ui'
import { clock, hm, num, vnd } from '../lib/format'
import type { PageId } from '../lib/nav'
import { calcBill, shiftTotals, useNow, useStore } from '../lib/store'
import type { Machine } from '../lib/types'

type ModalState = null | { t: 'open'; machineId?: string } | { t: 'detail'; machineId: string } | { t: 'pay'; sessionId: string } | { t: 'order'; machineId?: string }

const STATE_TEXT = { empty: 'Trống', using: 'Đang sử dụng', maintenance: 'Bảo trì' } as const

export default function Machines({ go }: { go: (p: PageId) => void }) {
  const { state } = useStore()
  const now = useNow()
  const toast = useToast()
  const [zone, setZone] = useState<'all' | 'VIP' | 'Thường'>('all')
  const [status, setStatus] = useState<'all' | Machine['state']>('all')
  const [q, setQ] = useState('')
  const [modal, setModal] = useState<ModalState>(null)

  const counts = useMemo(() => ({
    using: state.machines.filter((m) => m.state === 'using').length,
    empty: state.machines.filter((m) => m.state === 'empty').length,
    maintenance: state.machines.filter((m) => m.state === 'maintenance').length,
  }), [state.machines])
  const total = state.machines.length
  const openSessions = state.sessions.filter((s) => s.status === 'open')
  const revenue = shiftTotals(state).revenue

  const list = state.machines.filter((m) => (zone === 'all' || m.zone === zone) && (status === 'all' || m.state === status) && (!q || m.id.toLowerCase().includes(q.toLowerCase())))

  const click = (m: Machine) => {
    if (m.state === 'empty') setModal({ t: 'open', machineId: m.id })
    else if (m.state === 'using') setModal({ t: 'detail', machineId: m.id })
    else { toast.show('warn', `${m.id} đang bảo trì`, 'Mở mục Bảo trì để xem phiếu sửa chữa.'); go('maintenance') }
  }

  return (
    <>
      <div className="page-head">
        <div><span className="eyebrow cyan">Trung tâm vận hành / Live floor</span><h1 className="title">Sơ đồ máy</h1></div>
        <div className="button-row">
          <div className="ops-status"><span className="pulse" /><strong>{counts.maintenance ? 'HOẠT ĐỘNG · 1 MÁY BẢO TRÌ' : 'TẤT CẢ HOẠT ĐỘNG'}</strong></div>
          <Button icon="plus" onClick={() => setModal({ t: 'open' })}>Mở phiên mới</Button>
        </div>
      </div>

      <div className="stats-row">
        <Stat label="Máy đang dùng" value={counts.using} pad2 meta={`${Math.round((counts.using / total) * 100)}% công suất`} icon="monitor" />
        <Stat label="Máy trống" value={counts.empty} pad2 meta="Sẵn sàng phục vụ" icon="check" tone="green" />
        <Stat label="Đang bảo trì" value={counts.maintenance} pad2 meta={`${state.tickets.filter((t) => t.status === 'open').length} phiếu đang xử lý`} icon="wrench" tone="amber" />
        <Stat label="Doanh thu ca" value={revenue} money meta={`${shiftTotals(state).count} hóa đơn trong ca`} metaTone="up" icon="chart" tone="magenta" />
      </div>

      <div className="card card-flush">
        <div className="toolbar">
          <Tabs value={zone} onChange={setZone} items={[{ value: 'all', label: 'Tất cả', count: total }, { value: 'VIP', label: 'Khu VIP', count: state.machines.filter((m) => m.zone === 'VIP').length }, { value: 'Thường', label: 'Khu thường', count: state.machines.filter((m) => m.zone === 'Thường').length }]} />
          <div className="toolbar-right">
            {(['empty', 'using', 'maintenance'] as const).map((s) => (
              <button key={s} className={`chip ${status === s ? 'active' : ''}`} onClick={() => setStatus(status === s ? 'all' : s)}>
                <span className="status-dot" style={{ color: s === 'empty' ? 'var(--green)' : s === 'using' ? 'var(--cyan)' : 'var(--amber)' }} />{STATE_TEXT[s]} · {counts[s]}
              </button>
            ))}
            <SearchBox value={q} onChange={setQ} placeholder="Tìm mã máy…" />
          </div>
        </div>
        <div style={{ padding: 16 }}>
          {list.length === 0 ? <div className="empty-state"><div><Icon name="search" size={28} /></div><strong>Không có máy phù hợp</strong><span>Thử bỏ bớt bộ lọc.</span></div> : (
            <div className="machine-grid" key={`${zone}-${status}`}>
              {list.map((m, i) => {
                const sess = openSessions.find((s) => s.machineId === m.id)
                const bill = sess ? calcBill(state, sess, now) : null
                const tk = state.tickets.find((t) => t.machineId === m.id && t.status === 'open')
                return (
                  <button key={m.id} className={`machine-card spot ${m.state}`} style={{ ['--i' as string]: i }} onClick={() => click(m)} aria-label={`${m.id} · ${STATE_TEXT[m.state]}`}>
                    <div className="machine-scan" />
                    <div className="machine-top">
                      <div className="machine-icon"><Icon name={m.state === 'maintenance' ? 'wrench' : 'monitor'} size={21} /></div>
                      <Badge tone={m.state}>{STATE_TEXT[m.state]}</Badge>
                    </div>
                    <div className="machine-heading"><div className="machine-code">{m.id}</div><div className="signal"><i /><i /><i /><i /></div></div>
                    <div className="machine-meta"><span>KHU {m.zone.toUpperCase()}</span><span>{num(m.rate)} ₫/GIỜ</span></div>
                    <span className="machine-spec">{m.zone === 'VIP' ? 'RTX 4070 · i7 · 240Hz' : 'RTX 3060 · i5 · 144Hz'}</span>
                    <div className="machine-time">{sess ? clock(now - sess.start) : m.state === 'maintenance' ? `Từ ${hm(tk?.time ?? now)}` : 'Sẵn sàng'}</div>
                    <div className="machine-user">
                      <span>{sess ? sess.customer : m.state === 'maintenance' ? tk?.issue : 'Nhấn để mở phiên'}</span>
                      {bill && <span className="fee">{vnd(bill.total)}</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><div><span className="eyebrow">Đang hoạt động</span><strong>Phiên đang mở · {openSessions.length}</strong></div></div>
        {openSessions.length === 0 ? <div className="empty-state" style={{ minHeight: 120 }}><strong>Chưa có phiên nào đang mở</strong><span>Chọn một máy trống để bắt đầu.</span></div> : (
          <div className="session-list">
            {openSessions.map((s) => {
              const b = calcBill(state, s, now)
              return (
                <div className="session-row" key={s.id}>
                  <div><strong>{s.machineId} · {s.customer}</strong><small>Mở lúc {hm(s.start)} · {s.openedBy}</small></div>
                  <div className="num"><strong style={{ fontFamily: 'var(--font-display)' }}>{clock(now - s.start)}</strong><small>{b.fnb ? `Máy ${vnd(b.fee)} + F&B ${vnd(b.fnb)}` : `${num(s.rate)} ₫/giờ`}</small></div>
                  <div className="cost">{vnd(b.total)}</div>
                  <div className="row-actions"><Button size="sm" tone="ghost" onClick={() => setModal({ t: 'order', machineId: s.machineId })}>Gọi món</Button><Button size="sm" tone="secondary" onClick={() => setModal({ t: 'pay', sessionId: s.id })}>Kết thúc</Button></div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modal?.t === 'open' && <OpenSessionModal machineId={modal.machineId} onClose={() => setModal(null)} />}
      {modal?.t === 'pay' && <CheckoutModal sessionId={modal.sessionId} onClose={() => setModal(null)} />}
      {modal?.t === 'order' && <NewOrderModal machineId={modal.machineId} onClose={() => setModal(null)} />}
      {modal?.t === 'detail' && <MachineDetail machineId={modal.machineId} onClose={() => setModal(null)} onPay={(id) => setModal({ t: 'pay', sessionId: id })} onOrder={(id) => setModal({ t: 'order', machineId: id })} />}
    </>
  )
}

function MachineDetail({ machineId, onClose, onPay, onOrder }: { machineId: string; onClose: () => void; onPay: (sessionId: string) => void; onOrder: (machineId: string) => void }) {
  const { state, act } = useStore()
  const now = useNow()
  const toast = useToast()
  const sess = state.sessions.find((s) => s.status === 'open' && s.machineId === machineId)
  const free = state.machines.filter((m) => m.state === 'empty')
  const [to, setTo] = useState(free[0]?.id ?? '')
  if (!sess) return null
  const bill = calcBill(state, sess, now)
  return (
    <Modal eyebrow={`Phiên ${sess.id}`} title={`${machineId} · ${sess.customer}`} onClose={onClose}
      footer={(close) => <><Button tone="ghost" onClick={close}>Đóng</Button><Button tone="secondary" icon="cart" onClick={() => { close(); setTimeout(() => onOrder(machineId), 240) }}>Gọi món</Button><Button icon="check" onClick={() => { close(); setTimeout(() => onPay(sess.id), 240) }}>Kết thúc phiên</Button></>}>
      <div className="detail-grid">
        <div><span>Thời lượng</span><strong>{clock(now - sess.start)}</strong><small>Từ {hm(sess.start)} · {sess.openedBy}</small></div>
        <div><span>Phí máy tạm tính</span><strong>{vnd(bill.fee)}</strong><small>{bill.minutes} phút · {num(sess.rate)} ₫/giờ</small></div>
        <div><span>Tổng tạm tính</span><strong style={{ color: 'var(--cyan)' }}>{vnd(bill.total)}</strong><small>Gồm F&B {vnd(bill.fnb)}</small></div>
      </div>

      <div className="choice-title">Đồ ăn & thức uống trong phiên</div>
      {bill.orders.length === 0 ? <span className="hint-copy">Chưa có đơn nào.</span> : bill.orders.map((o) => (
        <div className="cart-line" key={o.id}><span><strong>{o.id}</strong> · {o.lines.map((l) => `${l.qty} × ${l.name}`).join(', ')}</span><Badge tone={o.status === 'Mới' ? 'magenta' : 'empty'}>{o.status}</Badge><strong className="num">{vnd(o.total)}</strong></div>
      ))}

      <div className="choice-title">Chuyển sang máy khác</div>
      {free.length === 0 ? <span className="hint-copy">Hiện không còn máy trống.</span> : (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}><SelectField value={to} onChange={setTo} options={free.map((m) => ({ value: m.id, label: `${m.id} · Khu ${m.zone}` }))} /></div>
          <Button tone="ghost" icon="swap" onClick={() => { const r = act.moveSession(sess.id, to); toast(r); if (r.ok) onClose() }}>Chuyển máy</Button>
        </div>
      )}
      <div className="info-note"><Icon name="shield" size={15} /> Đơn giá của phiên được lưu lúc mở và không đổi khi chuyển máy.</div>
    </Modal>
  )
}
