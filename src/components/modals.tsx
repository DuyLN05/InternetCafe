import { useMemo, useState } from 'react'
import { calcBill, useStore } from '../lib/store'
import { clock, hms, dmy, norm, num, vnd } from '../lib/format'
import type { PayMethod } from '../lib/types'
import { Badge, Button, Icon, Modal, NumberField, ProductArt, SearchBox, SelectField, TextField, useToast } from './ui'

/* ============================================================
   Mở phiên mới
   ============================================================ */
export function OpenSessionModal({ machineId, onClose }: { machineId?: string; onClose: () => void }) {
  const { state, act } = useStore()
  const toast = useToast()
  const free = state.machines.filter((m) => m.state === 'empty')
  const [mid, setMid] = useState(machineId ?? free[0]?.id ?? '')
  const [kind, setKind] = useState<'member' | 'guest'>('member')
  const [q, setQ] = useState('')
  const [memberId, setMemberId] = useState<string>('')
  const machine = state.machines.find((m) => m.id === mid)
  const member = state.members.find((m) => m.id === memberId)
  const results = useMemo(() => {
    const k = norm(q.trim())
    return state.members.filter((m) => !k || norm(`${m.id} ${m.name} ${m.phone}`).includes(k)).slice(0, 4)
  }, [q, state.members])
  const low = member && member.balance < state.settings.lowBalance
  const valid = !!machine && (kind === 'guest' || (!!member && !member.locked))

  const submit = (close: () => void) => {
    const r = act.openSession({ machineId: mid, memberId: kind === 'member' ? memberId : undefined })
    toast(r)
    if (r.ok) close()
  }

  return (
    <Modal eyebrow="Mở phiên sử dụng" title="Thiết lập phiên mới" onClose={onClose}
      steps={[{ label: 'Chọn máy', state: machine ? 'done' : 'active' }, { label: 'Khách hàng', state: valid ? 'done' : 'active' }, { label: 'Xác nhận', state: valid ? 'active' : '' }]}
      footer={(close) => <><Button tone="ghost" onClick={close}>Hủy</Button><Button disabled={!valid} onClick={() => submit(close)}>Xác nhận mở phiên</Button></>}>
      {free.length === 0 ? (
        <div className="alert-bar danger"><Icon name="alert" /><div><strong>Không còn máy trống</strong><span>Hãy chờ khách kết thúc phiên hoặc đóng phiếu bảo trì.</span></div></div>
      ) : (
        <>
          <div className="selected-machine">
            <div className="icon-tile"><Icon name="monitor" /></div>
            <div><span>Máy đã chọn</span><strong>{machine ? `${machine.id} · KHU ${machine.zone.toUpperCase()}` : '—'}</strong></div>
            <div><span>Đơn giá lưu tại thời điểm mở</span><strong>{machine ? `${num(machine.rate)} ₫/giờ` : '—'}</strong></div>
            <Badge tone="empty">Trống</Badge>
          </div>
          {!machineId && <div style={{ marginTop: 14 }}><SelectField label="Đổi máy" value={mid} onChange={setMid} options={free.map((m) => ({ value: m.id, label: `${m.id} · Khu ${m.zone} · ${num(m.rate)} ₫/giờ` }))} /></div>}

          <div className="choice-title">Chọn loại khách hàng</div>
          <div className="choice-grid">
            <button className={`choice ${kind === 'member' ? 'active' : ''}`} onClick={() => setKind('member')}><Icon name="users" /><strong>Hội viên</strong><span>Tra cứu mã hoặc số điện thoại</span></button>
            <button className={`choice ${kind === 'guest' ? 'active' : ''}`} onClick={() => setKind('guest')}><Icon name="user" /><strong>Khách vãng lai</strong><span>Không sử dụng số dư ví</span></button>
          </div>

          {kind === 'member' && (
            <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
              <SearchBox wide value={q} onChange={setQ} placeholder="Tìm theo mã, tên hoặc số điện thoại…" />
              <div style={{ display: 'grid', gap: 6 }}>
                {results.map((m) => (
                  <button key={m.id} disabled={m.locked} className={`choice ${memberId === m.id ? 'active' : ''}`} style={{ minHeight: 56, opacity: m.locked ? 0.5 : 1 }} onClick={() => setMemberId(m.id)}>
                    <Icon name="user" /><strong>{m.id} · {m.name}</strong>
                    <span>{m.phone} · Số dư {vnd(m.balance)}{m.locked ? ' · ĐÃ KHÓA' : ''}</span>
                  </button>
                ))}
                {!results.length && <span className="hint-copy">Không tìm thấy hội viên phù hợp.</span>}
              </div>
              {low && <div className="alert-bar"><Icon name="alert" /><div><strong>Số dư thấp</strong><span>Dưới {vnd(state.settings.lowBalance)} — nhắc khách nạp thêm trước khi mở phiên.</span></div></div>}
            </div>
          )}
          <div className="info-note"><Icon name="shield" size={15} /> Phiên được nhân viên mở và kết thúc thủ công. Hệ thống không tự khóa/mở máy.</div>
        </>
      )}
    </Modal>
  )
}

/* ============================================================
   Kết thúc phiên & thanh toán (chốt giờ lúc mở màn hình)
   ============================================================ */
export function CheckoutModal({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const { state, act, user } = useStore()
  const toast = useToast()
  const [at] = useState(() => Date.now())
  const sess = state.sessions.find((s) => s.id === sessionId)
  const [method, setMethod] = useState<PayMethod>('cash')
  const [tendered, setTendered] = useState<number | null>(null)
  if (!sess) return null
  const bill = calcBill(state, sess, at)
  const member = state.members.find((m) => m.id === sess.memberId)
  const walletOk = !!member && member.balance >= bill.total
  const given = tendered ?? bill.total
  const change = given - bill.total
  const quick = Array.from(new Set([bill.total, Math.ceil(bill.total / 10000) * 10000, 50000, 100000, 200000, 500000])).filter((v) => v >= bill.total).slice(0, 5)

  const pay = (close: () => void) => {
    const r = act.checkout({ sessionId, method, tendered: method === 'cash' ? given : undefined, at })
    toast(r)
    if (r.ok) close()
  }

  return (
    <Modal size="lg" eyebrow="Kết thúc phiên & thanh toán" title={`${sess.machineId} · ${sess.customer}`} onClose={onClose}
      footer={(close) => (
        <>
          <Button tone="ghost" onClick={close}>Quay lại</Button>
          <Button tone="secondary" icon="printer" onClick={() => toast.show('info', 'Đã gửi lệnh in', 'Phiếu tạm tính đang được in.')}>In tạm tính</Button>
          <Button disabled={method === 'wallet' ? !walletOk : method === 'cash' ? change < 0 : false} onClick={() => pay(close)}>Xác nhận thanh toán</Button>
        </>
      )}>
      <div className="payment-body">
        <div>
          <div className="summary-grid">
            <div><span>Bắt đầu</span><strong>{hms(sess.start)}</strong><small>{dmy(sess.start)}</small></div>
            <div><span>Kết thúc · giờ máy chủ</span><strong>{hms(at)}</strong><small>{dmy(at)}</small></div>
            <div><span>Thời lượng</span><strong>{clock(at - sess.start)}</strong><small>Tính {bill.minutes} phút{bill.minutes === state.settings.minMinutes ? ' (mức tối thiểu)' : ''}</small></div>
          </div>
          <div className="bill-lines" style={{ marginBottom: 14 }}>
            <div><span>{bill.minutes} phút × {num(sess.rate)} ₫/giờ</span><strong className="num">{vnd(bill.fee)}</strong></div>
            <div><span>Đồ ăn & thức uống · {bill.orders.reduce((a, o) => a + o.lines.reduce((x, l) => x + l.qty, 0), 0)} sản phẩm</span><strong className="num">{vnd(bill.fnb)}</strong></div>
          </div>
          <div className="pay-total"><span>TỔNG CỘNG</span><strong className="num">{vnd(bill.total)}</strong><small>Làm tròn lên {num(state.settings.roundMoney)} ₫ · đơn giá đã lưu lúc mở phiên</small></div>

          <div className="choice-title">Phương thức thanh toán</div>
          <div className="payment-options">
            <button className={`pay-option ${method === 'cash' ? 'active' : ''}`} onClick={() => setMethod('cash')}><Icon name="coin" /><span>Tiền mặt</span>{method === 'cash' && <b><Icon name="check" size={13} /></b>}</button>
            <button className={`pay-option ${method === 'wallet' ? 'active' : ''}`} disabled={!member} onClick={() => setMethod('wallet')}><Icon name="wallet" /><span>Trừ số dư ví</span><small>{member ? `${vnd(member.balance)}${walletOk ? '' : ' · không đủ'}` : 'Chỉ dành cho hội viên'}</small>{method === 'wallet' && <b><Icon name="check" size={13} /></b>}</button>
            <button className={`pay-option ${method === 'transfer' ? 'active' : ''}`} onClick={() => setMethod('transfer')}><Icon name="receipt" /><span>Chuyển khoản</span><small>Xác nhận thủ công</small>{method === 'transfer' && <b><Icon name="check" size={13} /></b>}</button>
          </div>

          {method === 'cash' && (
            <div style={{ marginTop: 14 }}>
              <NumberField label="Tiền khách đưa" suffix="₫" value={tendered} onChange={setTendered} placeholder={num(bill.total)} />
              <div className="quick-amounts">{quick.map((v) => <button key={v} className={`chip ${given === v ? 'active' : ''}`} onClick={() => setTendered(v)}>{v === bill.total ? 'Vừa đủ' : num(v)}</button>)}</div>
              <div className="change"><span>{change >= 0 ? 'TIỀN THỪA' : 'CÒN THIẾU'}</span><strong className={change < 0 ? 'short num' : 'num'}>{vnd(Math.abs(change))}</strong></div>
            </div>
          )}
          {state.shift.status !== 'open' && <div className="alert-bar danger" style={{ marginTop: 14 }}><Icon name="alert" /><div><strong>Chưa mở ca làm việc</strong><span>Mở ca ở mục “Ca làm việc” trước khi thanh toán.</span></div></div>}
        </div>

        <div className="receipt">
          <div className="receipt-brand">ALTF4 GAMING CENTER</div>
          <span>{state.settings.address}</span>
          <b>HÓA ĐƠN THANH TOÁN</b>
          <div className="receipt-row"><span>Phí máy · {clock(at - sess.start)}</span><strong>{num(bill.fee)}</strong></div>
          {bill.orders.flatMap((o) => o.lines).map((l, i) => <div className="receipt-row" key={i}><span>{l.qty} × {l.name}</span><strong>{num(l.qty * l.price)}</strong></div>)}
          <div className="receipt-row total"><span>TỔNG CỘNG</span><strong>{vnd(bill.total)}</strong></div>
          <small>Thu ngân: {user.name}<br />{hms(at)} {dmy(at)}</small>
        </div>
      </div>
    </Modal>
  )
}

/* ============================================================
   Gọi món / bán lẻ
   ============================================================ */
export function NewOrderModal({ machineId, onClose }: { machineId?: string; onClose: () => void }) {
  const { state, act } = useStore()
  const toast = useToast()
  const using = state.machines.filter((m) => m.state === 'using')
  const [mid, setMid] = useState(machineId ?? '')
  const [q, setQ] = useState('')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [method, setMethod] = useState<PayMethod>('cash')
  const list = state.products.filter((p) => p.active && (!q || norm(p.name).includes(norm(q))))
  const lines = Object.entries(cart).filter(([, n]) => n > 0)
  const total = lines.reduce((t, [pid, n]) => t + n * (state.products.find((p) => p.id === pid)?.price ?? 0), 0)
  const set = (pid: string, d: number) => setCart((c) => {
    const p = state.products.find((x) => x.id === pid)!
    return { ...c, [pid]: Math.max(0, Math.min(p.stock, (c[pid] ?? 0) + d)) }
  })

  const submit = (close: () => void) => {
    const r = act.addOrder({ machineId: mid || undefined, lines: lines.map(([pid, qty]) => ({ pid, qty })), method })
    toast(r)
    if (r.ok) close()
  }

  return (
    <Modal size="lg" eyebrow="Dịch vụ" title="Tạo đơn hàng" onClose={onClose}
      footer={(close) => <><span className="num" style={{ marginRight: 'auto', fontWeight: 600 }}>Tổng: <span style={{ color: 'var(--cyan)', fontFamily: 'var(--font-display)', fontSize: 18 }}>{vnd(total)}</span></span><Button tone="ghost" onClick={close}>Hủy</Button><Button disabled={!lines.length} onClick={() => submit(close)}>{mid ? 'Ghi vào phiên máy' : 'Bán & lập hóa đơn'}</Button></>}>
      <div className="form-grid" style={{ marginBottom: 16 }}>
        <SelectField label="Giao tới" value={mid} onChange={setMid} options={[{ value: '', label: 'Bán lẻ tại quầy (thanh toán ngay)' }, ...using.map((m) => ({ value: m.id, label: `${m.id} · ${state.sessions.find((s) => s.status === 'open' && s.machineId === m.id)?.customer ?? ''}` }))]} />
        {!mid ? <SelectField label="Thanh toán" value={method} onChange={(v) => setMethod(v as PayMethod)} options={[{ value: 'cash', label: 'Tiền mặt' }, { value: 'transfer', label: 'Chuyển khoản' }]} /> : <SearchBox value={q} onChange={setQ} placeholder="Tìm sản phẩm…" />}
      </div>
      {!mid && <div style={{ marginBottom: 12 }}><SearchBox wide value={q} onChange={setQ} placeholder="Tìm sản phẩm…" /></div>}
      <div className="product-pick">
        {list.map((p) => (
          <button key={p.id} className="pick" disabled={p.stock === 0} onClick={() => set(p.id, 1)}>
            {!!cart[p.id] && <span className="qty-badge">{cart[p.id]}</span>}
            <ProductArt name={p.name} cat={p.cat} image={p.image} className="pick-art" />
            <strong>{p.name}</strong><span className="num">{vnd(p.price)}</span>
            <em>{p.stock === 0 ? 'Hết hàng' : p.stock <= p.min ? `Sắp hết · còn ${p.stock}` : `Còn ${p.stock}`}</em>
          </button>
        ))}
      </div>
      {lines.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="choice-title" style={{ marginTop: 0 }}>Giỏ hàng</div>
          {lines.map(([pid, n]) => {
            const p = state.products.find((x) => x.id === pid)!
            return (
              <div className="cart-line" key={pid}>
                <span>{p.name}</span>
                <div className="stepper-qty"><button aria-label="Giảm" onClick={() => set(pid, -1)}><Icon name="minus" size={14} /></button><span>{n}</span><button aria-label="Tăng" onClick={() => set(pid, 1)}><Icon name="plus" size={14} /></button></div>
                <strong className="num" style={{ minWidth: 86, textAlign: 'right' }}>{vnd(n * p.price)}</strong>
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}

/* ============================================================
   Nạp ví hội viên
   ============================================================ */
export function TopUpModal({ memberId, onClose }: { memberId: string; onClose: () => void }) {
  const { state, act } = useStore()
  const toast = useToast()
  const m = state.members.find((x) => x.id === memberId)
  const [amount, setAmount] = useState<number | null>(50000)
  const [method, setMethod] = useState<'cash' | 'transfer'>('cash')
  if (!m) return null
  const open = state.shift.status === 'open'
  return (
    <Modal size="sm" eyebrow="Nạp tiền ví" title={m.name} onClose={onClose}
      footer={(close) => <><Button tone="ghost" onClick={close}>Hủy</Button><Button disabled={!open || !amount} onClick={() => { const r = act.topUp(memberId, amount ?? 0, method); toast(r); if (r.ok) close() }}>Xác nhận nạp</Button></>}>
      <div className="form-stack">
        <div className="summary-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div><span>Mã hội viên</span><strong style={{ fontSize: 16 }}>{m.id}</strong></div>
          <div><span>Số dư hiện tại</span><strong className="num" style={{ fontSize: 16 }}>{vnd(m.balance)}</strong></div>
        </div>
        <div>
          <NumberField label="Số tiền nạp" suffix="₫" value={amount} onChange={setAmount} autoFocus />
          <div className="quick-amounts">{[20000, 50000, 100000, 200000, 500000].map((v) => <button key={v} className={`chip ${amount === v ? 'active' : ''}`} onClick={() => setAmount(v)}>+{num(v)}</button>)}</div>
        </div>
        <SelectField label="Hình thức" value={method} onChange={(v) => setMethod(v as 'cash' | 'transfer')} options={[{ value: 'cash', label: 'Tiền mặt (vào két ca)' }, { value: 'transfer', label: 'Chuyển khoản (xác nhận thủ công)' }]} />
        <div className="change" style={{ margin: 0 }}><span>SỐ DƯ SAU KHI NẠP</span><strong className="num">{vnd(m.balance + (amount ?? 0))}</strong></div>
        {!open && <div className="alert-bar danger" style={{ margin: 0 }}><Icon name="alert" /><div><strong>Chưa mở ca</strong><span>Cần mở ca làm việc để ghi nhận tiền nạp.</span></div></div>}
      </div>
    </Modal>
  )
}

/* ============================================================
   Đăng ký hội viên
   ============================================================ */
export function AddMemberModal({ onClose }: { onClose: () => void }) {
  const { act } = useStore()
  const toast = useToast()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [err, setErr] = useState<{ name?: string; phone?: string }>({})
  const submit = (close: () => void) => {
    const e: typeof err = {}
    if (name.trim().length < 2) e.name = 'Vui lòng nhập họ và tên.'
    if (phone.replace(/\D/g, '').length < 9) e.phone = 'Số điện thoại chưa hợp lệ.'
    setErr(e)
    if (Object.keys(e).length) return
    const r = act.addMember({ name, phone })
    toast(r)
    if (r.ok) close()
  }
  return (
    <Modal size="sm" eyebrow="Khách hàng" title="Đăng ký hội viên" onClose={onClose}
      footer={(close) => <><Button tone="ghost" onClick={close}>Hủy</Button><Button onClick={() => submit(close)}>Đăng ký</Button></>}>
      <div className="form-stack">
        <TextField label="Họ và tên" icon="user" value={name} onChange={setName} error={err.name} autoFocus placeholder="Nguyễn Văn A" />
        <TextField label="Số điện thoại" icon="coin" value={phone} onChange={setPhone} error={err.phone} placeholder="09xx xxx xxx" type="tel" onEnter={() => submit(onClose)} />
        <div className="info-note" style={{ margin: 0 }}><Icon name="info" size={15} /> Mã hội viên được cấp tự động. Số dư ban đầu 0 ₫ — nạp tiền ở bước tiếp theo.</div>
      </div>
    </Modal>
  )
}
