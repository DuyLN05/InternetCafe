import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { seed } from './data'
import { fetchState, pushState } from './remote'
import { calcFee, dmy, norm, pad, vnd } from './format'
import { roleRank, type Banner, type Game, type Invoice, type LogEntry, type OrderLine, type Machine, type Member, type PayMethod, type Product, type Role, type Session, type State, type User } from './types'

/* ============================================================
   Store — toàn bộ nghiệp vụ quán net ở phía giao diện (dữ liệu mẫu).
   Mỗi action trả về { ok, msg } để UI hiện toast.
   Khi nối backend PHP, chỉ cần thay phần thân action bằng fetch().
   ============================================================ */

export type Result = { ok: true; msg: string; id?: string } | { ok: false; msg: string }
const ok = (msg: string, id?: string): Result => ({ ok: true, msg, id })
const fail = (msg: string): Result => ({ ok: false, msg })

/* ---------- tính hóa đơn tạm cho 1 phiên ---------- */
export function calcBill(s: State, sess: Session, now: number) {
  const { minutes, fee } = calcFee(now - sess.start, sess.rate, s.settings.minMinutes, s.settings.roundMoney)
  const orders = s.orders.filter((o) => o.sessionId === sess.id && o.status !== 'Đã hủy' && !o.billed)
  const fnb = orders.reduce((a, o) => a + o.total, 0)
  return { minutes, fee, orders, fnb, total: fee + fnb }
}

export function shiftTotals(s: State) {
  const inv = s.invoices.filter((i) => i.shiftId === s.shift.id && i.status === 'paid')
  const by = (m: PayMethod) => inv.filter((i) => i.method === m)
  const sum = (a: Invoice[]) => a.reduce((x, i) => x + i.total, 0)
  const topCash = s.walletTx.filter((t) => t.shiftId === s.shift.id && t.method === 'cash').reduce((a, t) => a + t.amount, 0)
  const topTransfer = s.walletTx.filter((t) => t.shiftId === s.shift.id && t.method === 'transfer').reduce((a, t) => a + t.amount, 0)
  const cash = sum(by('cash')) + topCash
  return {
    cash, cashCount: by('cash').length,
    transfer: sum(by('transfer')) + topTransfer, transferCount: by('transfer').length,
    wallet: sum(by('wallet')), walletCount: by('wallet').length,
    revenue: sum(inv), count: inv.length,
    expected: s.shift.openCash + cash,
  }
}

/** Chuỗi 7 ngày: 6 ngày cũ (mẫu) + hôm nay tính từ hóa đơn thật */
export function weekStats(s: State) {
  const today = s.invoices.filter((i) => i.status === 'paid' && i.time >= s.dayStart)
  const h = s.history.map((x) => ({ ...x }))
  h[h.length - 1] = { d: 'CN', machine: today.reduce((a, i) => a + i.machineFee, 0), fnb: today.reduce((a, i) => a + i.fnb, 0) }
  return h
}

/* ---------- context ---------- */
interface Ctx { state: State; user: User; act: ReturnType<typeof makeActions>; saveError: boolean; resetAll: () => void; mode: 'php' | 'local'; notice: { n: number; text: string } }
const StoreCtx = createContext<Ctx | null>(null)
const NowCtx = createContext<number>(Date.now())

export const useStore = () => {
  const c = useContext(StoreCtx)
  if (!c) throw new Error('useStore ngoài StoreProvider')
  return c
}
export const useNow = () => useContext(NowCtx)

function NowProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  return <NowCtx.Provider value={now}>{children}</NowCtx.Provider>
}

/* ---------- lưu trữ bền vững: XAMPP (data/state.json) hoặc localStorage ---------- */
const KEY = 'altf4-state-v1'
export function loadLocalState(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const p = JSON.parse(raw) as { v: number; state: State }
      if (p?.v === 1 && p.state && Array.isArray(p.state.machines) && Array.isArray(p.state.products)) return { ...seed(), ...p.state }
    }
  } catch { /* dữ liệu hỏng → dùng dữ liệu mẫu */ }
  return seed()
}
export const clearSavedState = () => { try { localStorage.removeItem(KEY) } catch { /* bỏ qua */ } }
export const savedStateSize = () => { try { return (localStorage.getItem(KEY) ?? '').length } catch { return 0 } }
export const mergeState = (s: State): State => ({ ...seed(), ...s })

export interface Boot { mode: 'php' | 'local'; state: State; rev: number }

export function StoreProvider({ user, boot, children }: { user: User; boot: Boot; children: ReactNode }) {
  const php = boot.mode === 'php'
  const [state, setState] = useState<State>(boot.state)
  const [saveError, setSaveError] = useState(false)
  const [notice, setNotice] = useState<{ n: number; text: string }>({ n: 0, text: '' })
  const ref = useRef(state)
  const userRef = useRef(user)
  const timer = useRef(0)
  const rev = useRef(boot.rev)
  const saving = useRef(false)
  const again = useRef(false)
  userRef.current = user
  const say = (text: string) => setNotice((o) => ({ n: o.n + 1, text }))
  const apply = (s: State, r: number) => { ref.current = s; rev.current = r; setState(s) }

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current); timer.current = 0
    if (!php) {
      try { localStorage.setItem(KEY, JSON.stringify({ v: 1, state: ref.current })); setSaveError(false) } catch { setSaveError(true) }
      return
    }
    if (saving.current) { again.current = true; return }
    saving.current = true
    try {
      const r = await pushState(rev.current, ref.current)
      if (r && 'ok' in r) { rev.current = r.rev; setSaveError(false) }
      else if (r && 'conflict' in r) {
        const d = await fetchState()
        if (d?.state) { apply(mergeState(d.state), d.rev); say('Dữ liệu vừa được máy khác cập nhật — thao tác của bạn chưa lưu, hãy làm lại.') }
      } else setSaveError(true)
    } finally {
      saving.current = false
      if (again.current) { again.current = false; void flush() }
    }
  }, [php])

  const commit = (fn: (s: State) => State) => {
    const n = fn(ref.current)
    ref.current = n
    setState(n)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void flush(), php ? 350 : 250)
  }
  // lưu nốt khi đóng tab; lần đầu chưa có state.json trên máy chủ → tạo ngay từ dữ liệu mẫu
  useEffect(() => {
    if (php && boot.rev === 0) void flush()
    const on = () => { if (timer.current) void flush() }
    window.addEventListener('beforeunload', on)
    document.addEventListener('visibilitychange', on)
    return () => { window.removeEventListener('beforeunload', on); document.removeEventListener('visibilitychange', on); on() }
  }, [flush, php, boot.rev])
  // nhiều máy dùng chung: định kỳ kiểm tra bản mới trên máy chủ
  useEffect(() => {
    if (!php) return
    const id = window.setInterval(async () => {
      if (document.hidden || timer.current || saving.current) return
      const d = await fetchState(rev.current)
      if (!d || d.unchanged || !d.state || d.rev === rev.current || timer.current || saving.current) return
      apply(mergeState(d.state), d.rev)
      say('Đã đồng bộ dữ liệu mới từ máy khác.')
    }, 6000)
    return () => window.clearInterval(id)
  }, [php])
  const resetAll = useCallback(() => {
    window.clearTimeout(timer.current); timer.current = 0
    clearSavedState()
    const n = seed(); ref.current = n; setState(n)
    void flush()
  }, [flush])
  const actRef = useRef<ReturnType<typeof makeActions>>(undefined as never)
  actRef.current = makeActions(ref, commit, userRef)
  return (
    <StoreCtx.Provider value={{ state, user, act: actRef.current, saveError, resetAll, mode: boot.mode, notice }}>
      <NowProvider>{children}</NowProvider>
    </StoreCtx.Provider>
  )
}

/* ---------- actions ---------- */
type Commit = (fn: (s: State) => State) => void

function makeActions(ref: { current: State }, commit: Commit, userRef: { current: User }) {
  const me = () => userRef.current
  const can = (min: Role) => roleRank[me().role] >= roleRank[min]
  const denied = () => fail('Vai trò hiện tại không có quyền thực hiện thao tác này.')
  const nid = (s: State) => s.seq + 1

  const addLog = (s: State, action: string, target: string, detail: string): State => {
    const e: LogEntry = { id: s.seq + 1, time: Date.now(), user: me().name, role: me().role, action, target, detail }
    return { ...s, seq: s.seq + 1, logs: [e, ...s.logs].slice(0, 200) }
  }
  const setMachine = (ms: Machine[], id: string, state: Machine['state']) => ms.map((m) => (m.id === id ? { ...m, state } : m))
  const invoiceCode = (s: State) => `HD-${dmy(Date.now()).split('/').reverse().join('').slice(2)}-${pad(s.invoices.length + 40)}`

  return {
    log: (action: string, target: string, detail: string) => commit((s) => addLog(s, action, target, detail)),

    /* ---- Máy & phiên ---- */
    openSession(a: { machineId: string; memberId?: string }): Result {
      const s = ref.current
      const m = s.machines.find((x) => x.id === a.machineId)
      if (!m || m.state !== 'empty') return fail('Máy không sẵn sàng (đang dùng hoặc đang bảo trì).')
      let mem: Member | undefined
      if (a.memberId) {
        mem = s.members.find((x) => x.id === a.memberId)
        if (!mem) return fail('Không tìm thấy hội viên.')
        if (mem.locked) return fail('Tài khoản hội viên đang bị khóa.')
        if (s.sessions.some((x) => x.status === 'open' && x.memberId === mem!.id)) return fail('Hội viên này đang có một phiên khác đang mở.')
      }
      const id = `PS-${240500 + nid(s)}`
      const sess: Session = { id, machineId: m.id, memberId: mem?.id, customer: mem?.name ?? 'Khách vãng lai', start: Date.now(), rate: m.rate, status: 'open', openedBy: me().name }
      commit((x) => addLog({ ...x, sessions: [sess, ...x.sessions], machines: setMachine(x.machines, m.id, 'using') }, 'Mở phiên', id, `${m.id} · ${sess.customer}`))
      return ok(`Đã mở phiên ${id} cho máy ${m.id}.`, id)
    },

    moveSession(sessionId: string, toId: string): Result {
      const s = ref.current
      const sess = s.sessions.find((x) => x.id === sessionId && x.status === 'open')
      const to = s.machines.find((x) => x.id === toId)
      if (!sess) return fail('Phiên không tồn tại hoặc đã kết thúc.')
      if (!to || to.state !== 'empty') return fail('Máy đích không sẵn sàng.')
      const from = sess.machineId
      commit((x) => addLog({
        ...x,
        sessions: x.sessions.map((p) => (p.id === sessionId ? { ...p, machineId: toId } : p)),
        orders: x.orders.map((o) => (o.sessionId === sessionId ? { ...o, machineId: toId } : o)),
        machines: setMachine(setMachine(x.machines, from, 'empty'), toId, 'using'),
      }, 'Chuyển máy', sessionId, `${from} → ${toId}`))
      return ok(`Đã chuyển ${from} → ${toId}. Đơn giá giữ nguyên theo lúc mở phiên.`)
    },

    checkout(a: { sessionId: string; method: PayMethod; tendered?: number; at?: number }): Result {
      const s = ref.current
      if (s.shift.status !== 'open') return fail('Chưa mở ca làm việc. Hãy mở ca trước khi thanh toán.')
      const sess = s.sessions.find((x) => x.id === a.sessionId && x.status === 'open')
      if (!sess) return fail('Phiên không tồn tại hoặc đã kết thúc.')
      const now = a.at ?? Date.now() // giờ chốt lúc mở màn thanh toán → số tiền không nhảy khi đang thu
      const bill = calcBill(s, sess, now)
      const mem = s.members.find((m) => m.id === sess.memberId)
      if (a.method === 'wallet') {
        if (!mem) return fail('Khách vãng lai không thể trừ số dư ví.')
        if (mem.balance < bill.total) return fail('Số dư ví không đủ — hãy nạp thêm hoặc chọn phương thức khác.')
      }
      if (a.method === 'cash' && (a.tendered ?? bill.total) < bill.total) return fail('Tiền khách đưa chưa đủ.')
      const code = invoiceCode(s)
      const inv: Invoice = { id: code, customer: sess.customer, machineId: sess.machineId, machineFee: bill.fee, fnb: bill.fnb, total: bill.total, method: a.method, status: 'paid', time: now, shiftId: s.shift.id, memberId: sess.memberId, by: me().name }
      commit((x) => addLog({
        ...x,
        invoices: [inv, ...x.invoices],
        sessions: x.sessions.map((p) => (p.id === sess.id ? { ...p, status: 'closed', end: now, fee: bill.fee, minutes: bill.minutes, invoiceId: code } : p)),
        orders: x.orders.map((o) => (o.sessionId === sess.id && o.status !== 'Đã hủy' ? { ...o, billed: true } : o)),
        machines: setMachine(x.machines, sess.machineId, 'empty'),
        members: x.members.map((m) => (m.id === sess.memberId ? { ...m, last: now, balance: a.method === 'wallet' ? m.balance - bill.total : m.balance } : m)),
      }, 'Kết thúc phiên', sess.id, `${sess.machineId} · ${vnd(bill.total)}`))
      return ok(`Thanh toán ${vnd(bill.total)} đã được ghi nhận. Hóa đơn ${code}.`, code)
    },

    /* ---- Hội viên & ví ---- */
    addMember(a: { name: string; phone: string }): Result {
      const s = ref.current
      if (a.name.trim().length < 2) return fail('Vui lòng nhập họ tên hội viên.')
      if (a.phone.replace(/\D/g, '').length < 9) return fail('Số điện thoại chưa hợp lệ.')
      if (s.members.some((m) => m.phone.replace(/\s/g, '') === a.phone.replace(/\s/g, ''))) return fail('Số điện thoại đã tồn tại.')
      const max = Math.max(...s.members.map((m) => parseInt(m.id.slice(3), 10)))
      const id = `HV-${String(max + 1).padStart(5, '0')}`
      commit((x) => addLog({ ...x, members: [{ id, name: a.name.trim(), phone: a.phone.trim(), balance: 0, last: Date.now(), locked: false }, ...x.members] }, 'Đăng ký hội viên', id, a.name.trim()))
      return ok(`Đã đăng ký hội viên ${id}.`, id)
    },
    topUp(memberId: string, amount: number, method: PayMethod): Result {
      const s = ref.current
      const m = s.members.find((x) => x.id === memberId)
      if (!m) return fail('Không tìm thấy hội viên.')
      if (m.locked) return fail('Tài khoản đang bị khóa.')
      if (!Number.isFinite(amount) || amount < 10000) return fail('Số tiền nạp tối thiểu 10.000 ₫.')
      commit((x) => addLog({
        ...x,
        members: x.members.map((p) => (p.id === memberId ? { ...p, balance: p.balance + amount } : p)),
        walletTx: [{ id: `NV-${nid(x)}`, memberId, amount, method, time: Date.now(), shiftId: x.shift.id }, ...x.walletTx],
      }, 'Nạp ví', memberId, `+${vnd(amount)}`))
      return ok(`Đã nạp ${vnd(amount)} vào ví ${m.name}.`)
    },
    toggleMemberLock(id: string): Result {
      if (!can('Quản lý')) return denied()
      const m = ref.current.members.find((x) => x.id === id)
      if (!m) return fail('Không tìm thấy hội viên.')
      commit((x) => addLog({ ...x, members: x.members.map((p) => (p.id === id ? { ...p, locked: !p.locked } : p)) }, m.locked ? 'Mở khóa hội viên' : 'Khóa hội viên', id, m.name))
      return ok(m.locked ? `Đã mở khóa ${m.name}.` : `Đã khóa tài khoản ${m.name}.`)
    },

    /* ---- Đồ ăn & đơn hàng ---- */
    addOrder(a: { machineId?: string; lines: { pid: string; qty: number }[]; method?: PayMethod }): Result {
      const s = ref.current
      if (!a.lines.length) return fail('Chưa chọn sản phẩm nào.')
      const lines: OrderLine[] = []
      for (const l of a.lines) {
        const p = s.products.find((x) => x.id === l.pid)
        if (!p) return fail('Sản phẩm không tồn tại.')
        if (l.qty > p.stock) return fail(`"${p.name}" chỉ còn ${p.stock} — không đủ để bán.`)
        lines.push({ pid: p.id, name: p.name, qty: l.qty, price: p.price }) // giá lưu tại thời điểm bán
      }
      const total = lines.reduce((t, l) => t + l.qty * l.price, 0)
      const sess = a.machineId ? s.sessions.find((x) => x.status === 'open' && x.machineId === a.machineId) : undefined
      if (a.machineId && !sess) return fail('Máy này không có phiên đang mở.')
      const id = `DH-${10500 + nid(s)}`
      const counter = !sess
      if (counter && s.shift.status !== 'open') return fail('Chưa mở ca làm việc — không thể bán lẻ tại quầy.')
      const order = { id, machineId: sess?.machineId, sessionId: sess?.id, customer: sess?.customer ?? 'Khách vãng lai', lines, total, time: Date.now(), status: (counter ? 'Đã phục vụ' : 'Mới') as 'Mới', billed: counter }
      commit((x) => {
        let n: State = {
          ...x,
          orders: [order, ...x.orders],
          products: x.products.map((p) => { const l = lines.find((q) => q.pid === p.id); return l ? { ...p, stock: p.stock - l.qty, sold: p.sold + l.qty } : p }),
        }
        if (counter) {
          const inv: Invoice = { id: invoiceCode(n), customer: 'Khách vãng lai', machineFee: 0, fnb: total, total, method: a.method ?? 'cash', status: 'paid', time: Date.now(), shiftId: n.shift.id, by: me().name }
          n = { ...n, invoices: [inv, ...n.invoices] }
        }
        return addLog(n, 'Tạo đơn hàng', id, `${lines.length} sản phẩm · ${vnd(total)}`)
      })
      return ok(counter ? `Bán lẻ ${vnd(total)} — đã lập hóa đơn.` : `Đơn ${id} đã ghi vào phiên máy ${sess!.machineId}.`, id)
    },
    setOrderStatus(id: string, status: 'Đã phục vụ' | 'Đã hủy'): Result {
      const o = ref.current.orders.find((x) => x.id === id)
      if (!o) return fail('Không tìm thấy đơn hàng.')
      if (o.billed) return fail('Đơn đã được thanh toán, không thể thay đổi.')
      if (o.status === 'Đã hủy') return fail('Đơn đã hủy.')
      commit((x) => addLog({
        ...x,
        orders: x.orders.map((p) => (p.id === id ? { ...p, status } : p)),
        products: status === 'Đã hủy' ? x.products.map((p) => { const l = o.lines.find((q) => q.pid === p.id); return l ? { ...p, stock: p.stock + l.qty, sold: Math.max(0, p.sold - l.qty) } : p }) : x.products,
      }, status === 'Đã hủy' ? 'Hủy đơn' : 'Phục vụ đơn', id, o.machineId ?? 'Quầy'))
      return ok(status === 'Đã hủy' ? `Đã hủy đơn ${id} và hoàn lại tồn kho.` : `Đơn ${id} đã phục vụ.`)
    },

    /* ---- Hóa đơn ---- */
    refundInvoice(id: string, reason: string): Result {
      if (!can('Quản lý')) return denied()
      const inv = ref.current.invoices.find((x) => x.id === id)
      if (!inv || inv.status !== 'paid') return fail('Hóa đơn không hợp lệ để hoàn tiền.')
      if (reason.trim().length < 3) return fail('Phải nhập lý do hoàn tiền.')
      commit((x) => addLog({
        ...x,
        invoices: x.invoices.map((p) => (p.id === id ? { ...p, status: 'refunded', refundReason: reason.trim() } : p)),
        members: inv.method === 'wallet' ? x.members.map((m) => (m.id === inv.memberId ? { ...m, balance: m.balance + inv.total } : m)) : x.members,
      }, 'Hoàn tiền', id, `${vnd(inv.total)} · ${reason.trim()}`))
      return ok(`Đã hoàn ${vnd(inv.total)} cho hóa đơn ${id}.`)
    },

    /* ---- Sản phẩm & kho ---- */
    addProduct(a: { name: string; cat: Product['cat']; price: number; stock: number; min: number; image?: string }): Result {
      if (!can('Quản lý')) return denied()
      const s = ref.current
      if (a.name.trim().length < 2) return fail('Vui lòng nhập tên sản phẩm.')
      if (!(a.price >= 1000)) return fail('Giá bán tối thiểu 1.000 ₫.')
      if (s.products.some((p) => norm(p.name) === norm(a.name))) return fail('Sản phẩm đã tồn tại.')
      const id = `SP-${String(Math.max(...s.products.map((p) => parseInt(p.id.slice(3), 10))) + 1).padStart(3, '0')}`
      commit((x) => addLog({ ...x, products: [...x.products, { id, name: a.name.trim(), cat: a.cat, price: a.price, stock: Math.max(0, a.stock), min: Math.max(0, a.min), sold: 0, active: true, ...(a.image ? { image: a.image } : {}) }] }, 'Thêm sản phẩm', id, a.name.trim()))
      return ok(`Đã thêm sản phẩm ${id}.`, id)
    },
    updateProduct(a: { id: string; name: string; cat: Product['cat']; price: number; min: number; image?: string }): Result {
      if (!can('Quản lý')) return denied()
      const s = ref.current
      const p = s.products.find((x) => x.id === a.id)
      if (!p) return fail('Sản phẩm không tồn tại.')
      if (a.name.trim().length < 2) return fail('Vui lòng nhập tên sản phẩm.')
      if (!(a.price >= 1000)) return fail('Giá bán tối thiểu 1.000 ₫.')
      if (s.products.some((x) => x.id !== a.id && norm(x.name) === norm(a.name))) return fail('Tên sản phẩm đã tồn tại.')
      commit((x) => addLog({ ...x, products: x.products.map((q) => (q.id === a.id ? { ...q, name: a.name.trim(), cat: a.cat, price: a.price, min: Math.max(0, a.min), image: a.image } : q)) }, 'Sửa sản phẩm', a.id, a.name.trim()))
      return ok(`Đã cập nhật ${a.name.trim()}.`)
    },
    setProductImage(id: string, image?: string): Result {
      if (!can('Quản lý')) return denied()
      const p = ref.current.products.find((x) => x.id === id)
      if (!p) return fail('Sản phẩm không tồn tại.')
      commit((x) => addLog({ ...x, products: x.products.map((q) => (q.id === id ? { ...q, image } : q)) }, image ? 'Cập nhật ảnh' : 'Xóa ảnh', id, p.name))
      return ok(image ? `Đã cập nhật ảnh cho ${p.name}.` : `Đã xóa ảnh của ${p.name}.`)
    },
    /* ---- Banner quảng cáo ---- */
    addBanner(a: Omit<Banner, 'id'>): Result {
      if (!can('Quản lý')) return denied()
      if (a.title.trim().length < 3) return fail('Vui lòng nhập tiêu đề banner (ít nhất 3 ký tự).')
      const s = ref.current
      const id = `BN-${String(Math.max(0, ...s.banners.map((b) => parseInt(b.id.slice(3), 10))) + 1).padStart(3, '0')}`
      commit((x) => addLog({ ...x, banners: [...x.banners, { ...a, id, title: a.title.trim(), tag: a.tag.trim() || 'MỚI', subtitle: a.subtitle.trim(), cta: a.cta.trim() }] }, 'Thêm banner', id, a.title.trim()))
      return ok(`Đã thêm banner ${a.title.trim()}.`, id)
    },
    updateBanner(a: Banner): Result {
      if (!can('Quản lý')) return denied()
      if (!ref.current.banners.some((b) => b.id === a.id)) return fail('Banner không tồn tại.')
      if (a.title.trim().length < 3) return fail('Vui lòng nhập tiêu đề banner (ít nhất 3 ký tự).')
      commit((x) => addLog({ ...x, banners: x.banners.map((b) => (b.id === a.id ? { ...a, title: a.title.trim(), tag: a.tag.trim() || 'MỚI', subtitle: a.subtitle.trim(), cta: a.cta.trim() } : b)) }, 'Sửa banner', a.id, a.title.trim()))
      return ok('Đã cập nhật banner.')
    },
    deleteBanner(id: string): Result {
      if (!can('Quản lý')) return denied()
      const b = ref.current.banners.find((x) => x.id === id)
      if (!b) return fail('Banner không tồn tại.')
      commit((x) => addLog({ ...x, banners: x.banners.filter((q) => q.id !== id) }, 'Xóa banner', id, b.title))
      return ok(`Đã xóa banner ${b.title}.`)
    },
    /* ---- Tựa game ---- */
    addGame(a: Omit<Game, 'id'>): Result {
      if (!can('Quản lý')) return denied()
      const s = ref.current
      if (a.name.trim().length < 2) return fail('Vui lòng nhập tên game.')
      if (s.games.some((g) => norm(g.name) === norm(a.name))) return fail('Game này đã có trong danh sách.')
      const id = `GM-${String(Math.max(0, ...s.games.map((g) => parseInt(g.id.slice(3), 10))) + 1).padStart(3, '0')}`
      commit((x) => addLog({ ...x, games: [...x.games, { ...a, id, name: a.name.trim(), genre: a.genre.trim() || 'Game', desc: a.desc.trim() }] }, 'Thêm game', id, a.name.trim()))
      return ok(`Đã thêm game ${a.name.trim()}.`, id)
    },
    updateGame(a: Game): Result {
      if (!can('Quản lý')) return denied()
      const s = ref.current
      if (!s.games.some((g) => g.id === a.id)) return fail('Game không tồn tại.')
      if (a.name.trim().length < 2) return fail('Vui lòng nhập tên game.')
      if (s.games.some((g) => g.id !== a.id && norm(g.name) === norm(a.name))) return fail('Tên game đã tồn tại.')
      commit((x) => addLog({ ...x, games: x.games.map((g) => (g.id === a.id ? { ...a, name: a.name.trim(), genre: a.genre.trim() || 'Game', desc: a.desc.trim() } : g)) }, 'Sửa game', a.id, a.name.trim()))
      return ok(`Đã cập nhật ${a.name.trim()}.`)
    },
    deleteGame(id: string): Result {
      if (!can('Quản lý')) return denied()
      const g = ref.current.games.find((x) => x.id === id)
      if (!g) return fail('Game không tồn tại.')
      commit((x) => addLog({ ...x, games: x.games.filter((q) => q.id !== id) }, 'Xóa game', id, g.name))
      return ok(`Đã xóa ${g.name}.`)
    },
    restock(a: { pid: string; qty: number; supplier: string }): Result {
      if (!can('Quản lý')) return denied()
      const p = ref.current.products.find((x) => x.id === a.pid)
      if (!p) return fail('Sản phẩm không tồn tại.')
      if (!(a.qty > 0)) return fail('Số lượng nhập phải lớn hơn 0.')
      commit((x) => addLog({
        ...x,
        products: x.products.map((q) => (q.id === a.pid ? { ...q, stock: q.stock + a.qty } : q)),
        stockMoves: [{ id: `NK-${nid(x)}`, pid: a.pid, type: 'in', qty: a.qty, note: `Nhập từ ${a.supplier}`, time: Date.now(), by: me().name }, ...x.stockMoves],
      }, 'Nhập kho', a.pid, `+${a.qty} · ${a.supplier}`))
      return ok(`Đã nhập ${a.qty} × ${p.name}.`)
    },
    adjustStock(a: { pid: string; delta: number; reason: string }): Result {
      if (!can('Quản lý')) return denied()
      const p = ref.current.products.find((x) => x.id === a.pid)
      if (!p) return fail('Sản phẩm không tồn tại.')
      if (a.reason.trim().length < 3) return fail('Mọi điều chỉnh tồn kho bắt buộc nhập lý do.')
      if (!a.delta) return fail('Số lượng điều chỉnh phải khác 0.')
      if (p.stock + a.delta < 0) return fail('Tồn kho không thể âm.')
      commit((x) => addLog({
        ...x,
        products: x.products.map((q) => (q.id === a.pid ? { ...q, stock: q.stock + a.delta } : q)),
        stockMoves: [{ id: `DC-${nid(x)}`, pid: a.pid, type: 'adjust', qty: a.delta, note: a.reason.trim(), time: Date.now(), by: me().name }, ...x.stockMoves],
      }, 'Điều chỉnh tồn', a.pid, `${a.delta > 0 ? '+' : ''}${a.delta} · Lý do: ${a.reason.trim()}`))
      return ok(`Đã điều chỉnh tồn "${p.name}" (${a.delta > 0 ? '+' : ''}${a.delta}).`)
    },

    /* ---- Bảo trì ---- */
    reportIssue(a: { machineId: string; issue: string }): Result {
      const s = ref.current
      const m = s.machines.find((x) => x.id === a.machineId)
      if (!m) return fail('Chưa chọn máy.')
      if (m.state === 'using') return fail('Máy đang có phiên sử dụng — hãy kết thúc hoặc chuyển phiên trước.')
      if (m.state === 'maintenance') return fail('Máy đã có phiếu bảo trì đang mở.')
      if (a.issue.trim().length < 5) return fail('Vui lòng mô tả sự cố (ít nhất 5 ký tự).')
      const id = `BT-${String(58 + s.tickets.length - 2).padStart(4, '0')}`
      commit((x) => addLog({
        ...x,
        machines: setMachine(x.machines, m.id, 'maintenance'),
        tickets: [{ id, machineId: m.id, issue: a.issue.trim(), assignee: 'Lê Văn Sơn', time: Date.now(), status: 'open' }, ...x.tickets],
      }, 'Báo sự cố', id, `${m.id} · ${a.issue.trim()}`))
      return ok(`Đã tạo phiếu ${id} — máy ${m.id} chuyển sang bảo trì.`, id)
    },
    closeTicket(id: string, result: string): Result {
      if (!can('Quản lý')) return denied()
      const t = ref.current.tickets.find((x) => x.id === id)
      if (!t || t.status !== 'open') return fail('Phiếu không hợp lệ.')
      if (result.trim().length < 3) return fail('Vui lòng ghi kết quả xử lý.')
      commit((x) => addLog({
        ...x,
        tickets: x.tickets.map((p) => (p.id === id ? { ...p, status: 'closed', result: result.trim() } : p)),
        machines: setMachine(x.machines, t.machineId, 'empty'),
      }, 'Đóng phiếu bảo trì', id, `${t.machineId} · ${result.trim()}`))
      return ok(`Đã đóng phiếu ${id} — máy ${t.machineId} sẵn sàng phục vụ.`)
    },

    /* ---- Nhân viên ---- */
    addStaff(a: { name: string; username: string; role: Role }): Result {
      if (!can('Quản lý')) return denied()
      const s = ref.current
      if (a.role === 'Quản trị viên' && !can('Quản trị viên')) return fail('Chỉ Quản trị viên mới được cấp vai trò Quản trị viên.')
      if (a.name.trim().length < 2) return fail('Vui lòng nhập họ tên.')
      if (!/^[a-z0-9._]{3,}$/.test(a.username)) return fail('Tên đăng nhập ≥ 3 ký tự, chỉ gồm a-z, 0-9, dấu chấm hoặc gạch dưới.')
      if (s.staff.some((x) => x.username === a.username)) return fail('Tên đăng nhập đã tồn tại.')
      const id = `NV-${String(Math.max(...s.staff.map((x) => parseInt(x.id.slice(3), 10))) + 1).padStart(3, '0')}`
      commit((x) => addLog({ ...x, staff: [...x.staff, { id, name: a.name.trim(), username: a.username, role: a.role, active: true }] }, 'Thêm nhân viên', id, `${a.name.trim()} · ${a.role}`))
      return ok(`Đã tạo tài khoản ${a.username}. Mật khẩu tạm thời được gửi cho nhân viên.`, id)
    },
    toggleStaff(id: string): Result {
      if (!can('Quản lý')) return denied()
      const st = ref.current.staff.find((x) => x.id === id)
      if (!st) return fail('Không tìm thấy nhân viên.')
      if (st.username === me().username) return fail('Bạn không thể tự khóa tài khoản của mình.')
      commit((x) => addLog({ ...x, staff: x.staff.map((p) => (p.id === id ? { ...p, active: !p.active } : p)) }, st.active ? 'Khóa nhân viên' : 'Mở khóa nhân viên', id, st.name))
      return ok(st.active ? `Đã khóa tài khoản ${st.name}.` : `Đã mở khóa ${st.name}.`)
    },

    /* ---- Ca làm việc ---- */
    openShift(cash: number): Result {
      const s = ref.current
      if (s.shift.status === 'open') return fail('Đang có ca mở.')
      if (!(cash >= 0)) return fail('Tiền đầu ca không hợp lệ.')
      const sh = { id: `CA-${String(parseInt(s.shift.id.slice(3), 10) + 1).padStart(3, '0')}`, user: me().name, openAt: Date.now(), openCash: cash, status: 'open' as const }
      commit((x) => addLog({ ...x, shift: sh }, 'Mở ca', sh.id, `Tiền đầu ca ${vnd(cash)}`))
      return ok(`Đã mở ca ${sh.id}.`)
    },
    closeShift(counted: number): Result {
      const s = ref.current
      if (s.shift.status !== 'open') return fail('Không có ca đang mở.')
      if (!Number.isFinite(counted) || counted < 0) return fail('Nhập số tiền mặt thực tế đã kiểm đếm.')
      if (s.sessions.some((x) => x.status === 'open')) return fail('Còn phiên máy đang mở — hãy kết thúc & thanh toán trước khi kết ca.')
      const expected = shiftTotals(s).expected
      const closed = { ...s.shift, status: 'closed' as const, closeAt: Date.now(), expected, counted }
      commit((x) => addLog({ ...x, shift: closed, shifts: [closed, ...x.shifts] }, 'Kết ca', closed.id, `Chênh lệch ${vnd(counted - expected)}`))
      return ok(`Đã kết ca ${closed.id}. Chênh lệch ${vnd(counted - expected)}.`)
    },

    /* ---- Hệ thống ---- */
    saveSettings(p: Partial<State['settings']>): Result {
      if (!can('Quản trị viên')) return denied()
      const n = { ...ref.current.settings, ...p }
      if (!(n.minMinutes >= 0 && n.minMinutes <= 120)) return fail('Số phút tối thiểu phải từ 0 đến 120.')
      if (![100, 500, 1000].includes(n.roundMoney)) return fail('Đơn vị làm tròn tiền chỉ nhận 100 / 500 / 1.000 ₫.')
      if (!(n.rateVip >= 1000 && n.rateStd >= 1000)) return fail('Đơn giá mỗi giờ tối thiểu 1.000 ₫.')
      commit((x) => addLog({
        ...x, settings: n,
        machines: x.machines.map((m) => (m.state === 'using' ? m : { ...m, rate: m.zone === 'VIP' ? n.rateVip : n.rateStd })),
      }, 'Cập nhật cấu hình', 'settings', 'Quy tắc tính phí / đơn giá'))
      return ok('Cấu hình đã được lưu. Phiên đang chạy giữ nguyên đơn giá cũ.')
    },
    createBackup(): Result {
      if (!can('Quản trị viên')) return denied()
      commit((x) => addLog({ ...x, backups: [{ id: `BK-${nid(x)}`, name: `altf4_manual_${pad(new Date().getHours())}${pad(new Date().getMinutes())}`, time: Date.now(), by: me().name, size: '285 MB', kind: 'Thủ công' }, ...x.backups] }, 'Sao lưu', 'database', 'Thủ công'))
      return ok('Đã tạo bản sao lưu mới thành công.')
    },
    restoreBackup(id: string): Result {
      if (!can('Quản trị viên')) return denied()
      const b = ref.current.backups.find((x) => x.id === id)
      if (!b) return fail('Không tìm thấy bản sao lưu.')
      commit((x) => addLog(x, 'Phục hồi dữ liệu', b.id, b.name))
      return ok(`Đã gửi yêu cầu phục hồi từ "${b.name}". Thao tác được ghi vào nhật ký.`)
    },
  }
}
