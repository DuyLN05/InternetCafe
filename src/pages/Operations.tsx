import { useState } from 'react'
import { AddMemberModal, CheckoutModal, NewOrderModal, TopUpModal } from '../components/modals'
import { Badge, Button, DataTable, Icon, Modal, PageHead, SearchBox, Tabs, TextField, useToast, type Col } from '../components/ui'
import { clock, norm, num, stamp, vnd } from '../lib/format'
import { roleRank, type Invoice, type Member, type Order, type PayMethod, type Session } from '../lib/types'
import { calcBill, useNow, useStore } from '../lib/store'

const METHOD: Record<PayMethod, string> = { cash: 'Tiền mặt', wallet: 'Trừ số dư', transfer: 'Chuyển khoản' }

/* ============================================================
   Phiên sử dụng
   ============================================================ */
export function Sessions() {
  const { state } = useStore()
  const now = useNow()
  const [tab, setTab] = useState<'all' | 'open' | 'closed'>('all')
  const [q, setQ] = useState('')
  const [pay, setPay] = useState<string | null>(null)
  const rows = state.sessions.filter((s) => (tab === 'all' || s.status === tab) && (!q || norm(`${s.id} ${s.machineId} ${s.customer}`).includes(norm(q))))
  const cols: Col<Session>[] = [
    { head: 'Mã phiên', cell: (s) => s.id, className: 'code' },
    { head: 'Máy / Khách', cell: (s) => `${s.machineId} · ${s.customer}`, className: 'strong' },
    { head: 'Bắt đầu', cell: (s) => stamp(s.start) },
    { head: 'Kết thúc', cell: (s) => (s.end ? stamp(s.end) : '—') },
    { head: 'Thời lượng', cell: (s) => <span className="num">{clock((s.end ?? now) - s.start)}</span> },
    { head: 'Phí máy', cell: (s) => <span className="num">{vnd(s.status === 'open' ? calcBill(state, s, now).fee : s.fee ?? 0)}</span>, right: true },
    { head: 'Trạng thái', cell: (s) => (s.status === 'open' ? <Badge tone="using">Đang mở</Badge> : <Badge tone="empty">Đã kết thúc</Badge>) },
    { head: '', cell: (s) => s.status === 'open' && <div className="row-actions"><Button size="sm" tone="secondary" onClick={() => setPay(s.id)}>Kết thúc</Button></div> },
  ]
  return (
    <>
      <PageHead eyebrow="Vận hành máy" title="Lịch sử phiên sử dụng" />
      <div className="card card-flush">
        <div className="toolbar">
          <Tabs value={tab} onChange={setTab} items={[{ value: 'all', label: 'Tất cả', count: state.sessions.length }, { value: 'open', label: 'Đang mở', count: state.sessions.filter((s) => s.status === 'open').length }, { value: 'closed', label: 'Đã kết thúc', count: state.sessions.filter((s) => s.status === 'closed').length }]} />
          <SearchBox value={q} onChange={setQ} placeholder="Tìm mã phiên, máy, khách…" />
        </div>
        <DataTable key={tab + q} cols={cols} rows={rows} rowKey={(s) => s.id} />
      </div>
      <div className="note-line"><Icon name="shield" size={15} /> Mỗi máy chỉ có một phiên hoạt động. Nhân viên mở và kết thúc phiên thủ công.</div>
      {pay && <CheckoutModal sessionId={pay} onClose={() => setPay(null)} />}
    </>
  )
}

/* ============================================================
   Đơn hàng
   ============================================================ */
export function Orders() {
  const { state, act } = useStore()
  const toast = useToast()
  const [tab, setTab] = useState<'all' | Order['status']>('all')
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(false)
  const rows = state.orders.filter((o) => (tab === 'all' || o.status === tab) && (!q || norm(`${o.id} ${o.machineId ?? ''} ${o.customer} ${o.lines.map((l) => l.name).join(' ')}`).includes(norm(q))))
  const tone = { 'Mới': 'magenta', 'Đã phục vụ': 'empty', 'Đã hủy': 'muted' } as const
  const cols: Col<Order>[] = [
    { head: 'Mã đơn', cell: (o) => o.id, className: 'code' },
    { head: 'Máy / Khách', cell: (o) => o.machineId ? `${o.machineId} · ${o.customer}` : `Quầy · ${o.customer}`, className: 'strong' },
    { head: 'Sản phẩm', cell: (o) => o.lines.map((l) => `${l.qty} × ${l.name}`).join(', ') },
    { head: 'Tổng tiền', cell: (o) => <span className="num">{vnd(o.total)}</span>, right: true },
    { head: 'Thời điểm', cell: (o) => stamp(o.time) },
    { head: 'Trạng thái', cell: (o) => <Badge tone={tone[o.status]}>{o.status}</Badge> },
    { head: '', cell: (o) => o.status === 'Mới' && !o.billed && (
      <div className="row-actions">
        <Button size="sm" tone="secondary" onClick={() => toast(act.setOrderStatus(o.id, 'Đã phục vụ'))}>Phục vụ</Button>
        <Button size="sm" tone="danger" onClick={() => toast(act.setOrderStatus(o.id, 'Đã hủy'))}>Hủy</Button>
      </div>) },
  ]
  const fresh = state.orders.filter((o) => o.status === 'Mới').length
  return (
    <>
      <PageHead eyebrow="Dịch vụ" title="Đơn hàng" actions={<Button icon="plus" onClick={() => setModal(true)}>Tạo đơn</Button>} />
      {fresh > 0 && <div className="alert-bar" style={{ ['--c' as string]: 'var(--magenta)' }}><Icon name="bell" /><div><strong>{fresh} đơn mới đang chờ phục vụ</strong><span>Giá và tồn kho được lưu tại thời điểm bán.</span></div></div>}
      <div className="card card-flush">
        <div className="toolbar">
          <Tabs value={tab} onChange={setTab} items={[{ value: 'all', label: 'Tất cả', count: state.orders.length }, { value: 'Mới', label: 'Mới' }, { value: 'Đã phục vụ', label: 'Đã phục vụ' }, { value: 'Đã hủy', label: 'Đã hủy' }]} />
          <SearchBox value={q} onChange={setQ} placeholder="Tìm đơn, máy, sản phẩm…" />
        </div>
        <DataTable key={tab + q + state.orders.length} cols={cols} rows={rows} rowKey={(o) => o.id} />
      </div>
      {modal && <NewOrderModal onClose={() => setModal(false)} />}
    </>
  )
}

/* ============================================================
   Hội viên & ví
   ============================================================ */
export function Members() {
  const { state, act, user } = useStore()
  const toast = useToast()
  const [tab, setTab] = useState<'all' | 'active' | 'low' | 'locked'>('all')
  const [q, setQ] = useState('')
  const [top, setTop] = useState<string | null>(null)
  const [add, setAdd] = useState(false)
  const low = state.members.filter((m) => !m.locked && m.balance < state.settings.lowBalance)
  const rows = state.members.filter((m) => {
    const t = tab === 'all' || (tab === 'locked' ? m.locked : tab === 'low' ? !m.locked && m.balance < state.settings.lowBalance : !m.locked)
    return t && (!q || norm(`${m.id} ${m.name} ${m.phone}`).includes(norm(q)))
  })
  const cols: Col<Member>[] = [
    { head: 'Mã hội viên', cell: (m) => m.id, className: 'code' },
    { head: 'Họ và tên', cell: (m) => m.name, className: 'strong' },
    { head: 'Số điện thoại', cell: (m) => m.phone },
    { head: 'Số dư', cell: (m) => <span className="num" style={{ color: m.balance < state.settings.lowBalance ? 'var(--amber)' : undefined, fontWeight: 600 }}>{vnd(m.balance)}</span>, right: true },
    { head: 'Lần cuối dùng', cell: (m) => stamp(m.last) },
    { head: 'Trạng thái', cell: (m) => m.locked ? <Badge tone="muted">Đã khóa</Badge> : m.balance < state.settings.lowBalance ? <Badge tone="amber">Số dư thấp</Badge> : <Badge tone="empty">Hoạt động</Badge> },
    { head: '', cell: (m) => (
      <div className="row-actions">
        <Button size="sm" tone="secondary" icon="plus" disabled={m.locked} onClick={() => setTop(m.id)}>Nạp ví</Button>
        <Button size="sm" tone="ghost" disabled={roleRank[user.role] < 1} title={roleRank[user.role] < 1 ? 'Cần quyền Quản lý' : undefined} onClick={() => toast(act.toggleMemberLock(m.id))}>{m.locked ? 'Mở khóa' : 'Khóa'}</Button>
      </div>) },
  ]
  return (
    <>
      <PageHead eyebrow="Khách hàng" title="Hội viên & số dư" actions={<Button icon="plus" onClick={() => setAdd(true)}>Thêm hội viên</Button>} />
      {low.length > 0 && (
        <div className="alert-bar"><Icon name="alert" /><div><strong>{low.length} hội viên có số dư thấp</strong><span>Số dư dưới {vnd(state.settings.lowBalance)} — nhắc khách nạp thêm trước khi mở phiên.</span></div><Button tone="ghost" size="sm" onClick={() => setTab('low')}>Xem danh sách</Button></div>
      )}
      <div className="card card-flush">
        <div className="toolbar">
          <Tabs value={tab} onChange={setTab} items={[{ value: 'all', label: 'Tất cả', count: state.members.length }, { value: 'active', label: 'Hoạt động' }, { value: 'low', label: 'Số dư thấp', count: low.length }, { value: 'locked', label: 'Đã khóa' }]} />
          <SearchBox value={q} onChange={setQ} placeholder="Tìm theo mã, tên, số điện thoại…" />
        </div>
        <DataTable key={tab + q + state.members.length} cols={cols} rows={rows} rowKey={(m) => m.id} />
      </div>
      <div className="note-line"><Icon name="shield" size={15} /> Số dư ví không bao giờ âm. Mọi lần nạp / trừ đều được ghi vào lịch sử giao dịch và nhật ký.</div>
      {top && <TopUpModal memberId={top} onClose={() => setTop(null)} />}
      {add && <AddMemberModal onClose={() => setAdd(false)} />}
    </>
  )
}

/* ============================================================
   Hóa đơn
   ============================================================ */
export function Invoices() {
  const { state, act, user } = useStore()
  const toast = useToast()
  const [tab, setTab] = useState<'all' | 'paid' | 'refunded'>('all')
  const [q, setQ] = useState('')
  const [refund, setRefund] = useState<Invoice | null>(null)
  const [retail, setRetail] = useState(false)
  const rows = state.invoices.filter((i) => (tab === 'all' || i.status === tab) && (!q || norm(`${i.id} ${i.customer} ${i.machineId ?? ''}`).includes(norm(q))))
  const canRefund = roleRank[user.role] >= 1
  const cols: Col<Invoice>[] = [
    { head: 'Số hóa đơn', cell: (i) => i.id, className: 'code' },
    { head: 'Khách hàng', cell: (i) => i.customer, className: 'strong' },
    { head: 'Phí máy', cell: (i) => <span className="num">{i.machineFee ? vnd(i.machineFee) : '—'}</span>, right: true },
    { head: 'Sản phẩm', cell: (i) => <span className="num">{i.fnb ? vnd(i.fnb) : '—'}</span>, right: true },
    { head: 'Tổng cộng', cell: (i) => <span className="num" style={{ color: 'var(--text)', fontWeight: 600 }}>{vnd(i.total)}</span>, right: true },
    { head: 'Thanh toán', cell: (i) => METHOD[i.method] },
    { head: 'Thời điểm', cell: (i) => stamp(i.time) },
    { head: 'Trạng thái', cell: (i) => i.status === 'paid' ? <Badge tone="empty">Đã thanh toán</Badge> : <Badge tone="danger">Đã hoàn tiền</Badge> },
    { head: '', cell: (i) => i.status === 'paid' && <div className="row-actions"><Button size="sm" tone="ghost" icon="undo" disabled={!canRefund} title={canRefund ? undefined : 'Cần quyền Quản lý'} onClick={() => setRefund(i)}>Hoàn</Button></div> },
  ]
  return (
    <>
      <PageHead eyebrow="Thanh toán" title="Hóa đơn" actions={<Button icon="plus" onClick={() => setRetail(true)}>Bán lẻ tại quầy</Button>} />
      <div className="card card-flush">
        <div className="toolbar">
          <Tabs value={tab} onChange={setTab} items={[{ value: 'all', label: 'Tất cả', count: state.invoices.length }, { value: 'paid', label: 'Đã thanh toán' }, { value: 'refunded', label: 'Đã hoàn tiền' }]} />
          <SearchBox value={q} onChange={setQ} placeholder="Tìm số hóa đơn, khách, máy…" />
        </div>
        <DataTable key={tab + q + state.invoices.length} cols={cols} rows={rows} rowKey={(i) => i.id} />
      </div>
      <div className="note-line"><Icon name="shield" size={15} /> Hóa đơn đã thanh toán được bảo toàn dữ liệu và không thể xóa. Hoàn tiền phải do Quản lý phê duyệt và ghi rõ lý do.</div>
      {refund && <RefundModal invoice={refund} onClose={() => setRefund(null)} onDone={(r) => toast(r)} />}
      {retail && <NewOrderModal onClose={() => setRetail(false)} />}
    </>
  )
}

function RefundModal({ invoice, onClose, onDone }: { invoice: Invoice; onClose: () => void; onDone: (r: ReturnType<ReturnType<typeof useStore>['act']['refundInvoice']>) => void }) {
  const { act } = useStore()
  const [reason, setReason] = useState('')
  return (
    <Modal size="sm" eyebrow="Hoàn tiền" title={invoice.id} onClose={onClose}
      footer={(close) => <><Button tone="ghost" onClick={close}>Hủy</Button><Button tone="danger" onClick={() => { const r = act.refundInvoice(invoice.id, reason); onDone(r); if (r.ok) close() }}>Xác nhận hoàn {num(invoice.total)} ₫</Button></>}>
      <div className="form-stack">
        <div className="alert-bar danger" style={{ margin: 0 }}><Icon name="alert" /><div><strong>Thao tác không thể hoàn tác</strong><span>{invoice.method === 'wallet' ? 'Số tiền sẽ được hoàn lại vào ví hội viên.' : 'Hoàn tiền trực tiếp cho khách theo phương thức đã thanh toán.'}</span></div></div>
        <TextField label="Lý do hoàn tiền" value={reason} onChange={setReason} placeholder="VD: Máy treo giữa phiên" autoFocus />
      </div>
    </Modal>
  )
}
