import { useState } from 'react'
import { Button, DataTable, Icon, PageHead, SelectField, Stat, TextField, useToast, type Col } from '../components/ui'
import { downloadCsv, num, stamp, vnd } from '../lib/format'
import type { PageId } from '../lib/nav'
import { shiftTotals, useStore, weekStats } from '../lib/store'
import type { DayStat } from '../lib/types'

const mil = (v: number) => (v === 0 ? '0' : `${(v / 1e6).toFixed(1).replace('.0', '')}tr`)

export function RevenueChart({ data }: { data: DayStat[] }) {
  const rawMax = Math.max(...data.map((d) => d.machine + d.fnb), 1)
  const step = Math.pow(10, Math.floor(Math.log10(rawMax)))
  const max = Math.ceil(rawMax / step / 2) * step * 2 // trần "đẹp" cho trục Y
  return (
    <div className="chart" role="img" aria-label="Biểu đồ doanh thu 7 ngày">
      <div className="y-labels">{[1, 0.75, 0.5, 0.25, 0].map((f) => <span key={f}>{mil(max * f)}</span>)}</div>
      <div className="bars">
        {data.map((d, i) => {
          const total = d.machine + d.fnb
          return (
            <div className="bar-col" key={d.d}>
              <div className="bar-tip"><strong>{d.d === 'CN' ? 'Hôm nay' : d.d} · {vnd(total)}</strong><span><i style={{ background: 'var(--cyan)' }} />Máy {vnd(d.machine)}</span><span><i style={{ background: 'var(--magenta)' }} />F&B {vnd(d.fnb)}</span></div>
              <div className="bar-stack" style={{ height: `${(total / max) * 100}%`, ['--i' as string]: i }}>
                <i style={{ height: `${total ? (d.machine / total) * 100 : 0}%` }} /><b style={{ height: `${total ? (d.fnb / total) * 100 : 0}%` }} />
              </div>
              <span className="bar-label">{d.d === 'CN' ? 'Nay' : d.d}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ============================================================
   Dashboard
   ============================================================ */
export function Dashboard({ go }: { go: (p: PageId) => void }) {
  const { state, user } = useStore()
  const week = weekStats(state)
  const machine = week.reduce((a, d) => a + d.machine, 0)
  const fnb = week.reduce((a, d) => a + d.fnb, 0)
  const topups = 4_850_000 + state.walletTx.reduce((a, t) => a + t.amount, 0)
  const sessions = 1190 + state.sessions.length
  const using = state.machines.filter((m) => m.state === 'using').length
  const pct = Math.round((using / state.machines.length) * 100)
  const R = 62, len = 2 * Math.PI * R
  const low = state.products.filter((p) => p.stock <= p.min)
  const lowMem = state.members.filter((m) => !m.locked && m.balance < state.settings.lowBalance)
  const openTk = state.tickets.filter((t) => t.status === 'open')
  const fresh = state.orders.filter((o) => o.status === 'Mới')
  const alerts = [
    low.length && { tone: 'amber', icon: 'box', t: `${low.length} sản phẩm sắp hết`, d: `${low[0]?.name} chỉ còn ${low[0]?.stock}`, to: 'inventory' as PageId },
    lowMem.length && { tone: 'magenta', icon: 'users', t: `${lowMem.length} số dư hội viên thấp`, d: `Dưới ngưỡng ${vnd(state.settings.lowBalance)}`, to: 'members' as PageId },
    openTk.length && { tone: 'cyan', icon: 'wrench', t: `${openTk.length} phiếu bảo trì đang mở`, d: `${openTk[0].machineId} · ${openTk[0].issue}`, to: 'maintenance' as PageId },
    fresh.length && { tone: 'magenta', icon: 'cart', t: `${fresh.length} đơn chờ phục vụ`, d: `${fresh[0].machineId ?? 'Quầy'} · ${vnd(fresh[0].total)}`, to: 'orders' as PageId },
  ].filter(Boolean) as { tone: string; icon: string; t: string; d: string; to: PageId }[]
  const top = [...state.products].sort((a, b) => b.sold * b.price - a.sold * a.price).slice(0, 5)
  const topMax = top[0] ? top[0].sold * top[0].price : 1
  const t = shiftTotals(state)
  const staffRows = [
    { name: user.role === 'Thu ngân' ? user.name : state.shift.user, shift: state.shift.status === 'open' ? 'Ca hiện tại · đang mở' : 'Ca hiện tại · đã kết', sessions: state.sessions.length, orders: state.orders.length, revenue: t.revenue, top: state.walletTx.reduce((a, x) => a + x.amount, 0) },
    { name: 'Trương Thiện Thư', shift: 'Ca trước · đã kết', sessions: 38, orders: 27, revenue: 2_810_000, top: 720_000 },
  ]
  const cols: Col<(typeof staffRows)[number]>[] = [
    { head: 'Nhân viên', cell: (r) => r.name, className: 'strong' },
    { head: 'Ca', cell: (r) => r.shift },
    { head: 'Phiên máy', cell: (r) => <span className="num">{r.sessions}</span>, right: true },
    { head: 'Đơn F&B', cell: (r) => <span className="num">{r.orders}</span>, right: true },
    { head: 'Doanh thu', cell: (r) => <span className="num">{vnd(r.revenue)}</span>, right: true },
    { head: 'Nạp ví', cell: (r) => <span className="num">{vnd(r.top)}</span>, right: true },
  ]
  return (
    <>
      <PageHead eyebrow="Tổng quan quản lý" title="Dashboard" actions={<div className="ops-status"><Icon name="clock" size={15} /><strong>7 NGÀY GẦN NHẤT</strong></div>} />
      <div className="stats-row">
        <Stat label="Doanh thu dịch vụ máy" value={machine} money meta="+8,2% so với kỳ trước" metaTone="up" icon="monitor" />
        <Stat label="Đồ ăn & thức uống" value={fnb} money meta="+14,6% so với kỳ trước" metaTone="up" icon="cart" tone="magenta" />
        <Stat label="Lượt sử dụng" value={sessions} meta="Thời lượng TB 2 giờ 14 phút" icon="users" tone="green" />
        <Stat label="Nạp tiền ví" value={topups} money meta="Hiển thị riêng · không tính doanh thu" icon="wallet" tone="amber" />
      </div>
      <div className="dash-grid">
        <div className="card spot">
          <div className="card-head"><div><span className="eyebrow">Doanh thu</span><strong className="num">{vnd(machine + fnb)}</strong></div><div className="chart-legend"><span><i style={{ background: 'var(--cyan)' }} />Dịch vụ máy</span><span><i style={{ background: 'var(--magenta)' }} />F&B</span></div></div>
          <RevenueChart data={week} />
        </div>
        <div className="card">
          <div className="card-head"><div><span className="eyebrow">Cần chú ý</span><strong>Cảnh báo vận hành</strong></div><span className="count-pill">{alerts.length}</span></div>
          {alerts.length === 0 && <div className="empty-state" style={{ minHeight: 120 }}><strong>Mọi thứ đều ổn</strong><span>Không có cảnh báo nào.</span></div>}
          {alerts.map((a) => <button key={a.t} className={`alert-item ${a.tone}`} onClick={() => go(a.to)}><span className="ico"><Icon name={a.icon} size={18} /></span><div><strong>{a.t}</strong><span>{a.d}</span></div><Icon name="arrow" size={15} /></button>)}
        </div>
      </div>
      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-head"><div><span className="eyebrow">Công suất</span><strong>Máy đang hoạt động</strong></div></div>
          <div className="ring">
            <svg width="150" height="150" viewBox="0 0 150 150"><circle className="track" cx="75" cy="75" r={R} /><circle className="val" cx="75" cy="75" r={R} stroke="var(--cyan)" style={{ ['--len' as string]: len, ['--off' as string]: len * (1 - pct / 100) }} /></svg>
            <div className="ring-center"><strong>{pct}%</strong><span>{using}/{state.machines.length} MÁY</span></div>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div><span className="eyebrow">Bán chạy</span><strong>Top sản phẩm hôm nay</strong></div></div>
          {top.map((p, i) => <div className="rank-row" key={p.id}><span className="rank-no">0{i + 1}</span><strong>{p.name}</strong><span className="num">{p.sold} · {vnd(p.sold * p.price)}</span><div className="meter"><i style={{ width: `${(p.sold * p.price / topMax) * 100}%`, animationDelay: `${i * 90}ms` }} /></div></div>)}
        </div>
      </div>
      <div className="card card-flush" style={{ marginTop: 16 }}>
        <div className="card-head"><div><span className="eyebrow">Hiệu suất</span><strong>Hoạt động theo nhân viên / ca</strong></div></div>
        <DataTable cols={cols} rows={staffRows} rowKey={(r) => r.name} />
      </div>
    </>
  )
}

/* ============================================================
   Báo cáo (xuất CSV thật, in thật)
   ============================================================ */
export function Reports() {
  const { state } = useStore()
  const toast = useToast()
  const week = weekStats(state)
  const [type, setType] = useState<'revenue' | 'invoices' | 'stock'>('revenue')
  const [from, setFrom] = useState('12/05/2025')
  const [to, setTo] = useState('18/05/2025')
  const dayRows = week.map((d) => ({ ...d, total: d.machine + d.fnb }))

  const exportCsv = () => {
    if (type === 'revenue') downloadCsv('bao-cao-doanh-thu.csv', [['Ngày', 'Doanh thu máy', 'F&B', 'Tổng'], ...dayRows.map((d) => [d.d, d.machine, d.fnb, d.total])])
    else if (type === 'invoices') downloadCsv('bao-cao-hoa-don.csv', [['Số hóa đơn', 'Khách', 'Phí máy', 'Sản phẩm', 'Tổng', 'Thanh toán', 'Trạng thái', 'Thời điểm'], ...state.invoices.map((i) => [i.id, i.customer, i.machineFee, i.fnb, i.total, i.method, i.status, stamp(i.time)])])
    else downloadCsv('bao-cao-ton-kho.csv', [['Mã', 'Sản phẩm', 'Tồn', 'Tối thiểu', 'Đã bán'], ...state.products.map((p) => [p.id, p.name, p.stock, p.min, p.sold])])
    toast.show('success', 'Đã xuất CSV', 'Tệp đã được tải xuống máy của bạn.')
  }

  const dayCols: Col<(typeof dayRows)[number]>[] = [
    { head: 'Ngày', cell: (d) => (d.d === 'CN' ? 'Hôm nay' : d.d), className: 'strong' },
    { head: 'Doanh thu máy', cell: (d) => <span className="num">{vnd(d.machine)}</span>, right: true },
    { head: 'Đồ ăn & thức uống', cell: (d) => <span className="num">{vnd(d.fnb)}</span>, right: true },
    { head: 'Tổng', cell: (d) => <span className="num" style={{ color: 'var(--text)', fontWeight: 600 }}>{vnd(d.total)}</span>, right: true },
  ]
  return (
    <>
      <PageHead eyebrow="Phân tích" title="Báo cáo" actions={<div className="button-row"><Button tone="secondary" icon="printer" onClick={() => window.print()}>In báo cáo</Button><Button icon="download" onClick={exportCsv}>Xuất CSV</Button></div>} />
      <div className="card">
        <div className="report-filters">
          <TextField label="Từ ngày" icon="clock" value={from} onChange={setFrom} />
          <TextField label="Đến ngày" icon="clock" value={to} onChange={setTo} />
          <SelectField label="Nhân viên" value="all" onChange={() => {}} options={[{ value: 'all', label: 'Tất cả nhân viên' }, ...state.staff.filter((s) => s.active).map((s) => ({ value: s.id, label: s.name }))]} />
          <SelectField label="Loại báo cáo" value={type} onChange={(v) => setType(v as typeof type)} options={[{ value: 'revenue', label: 'Tổng hợp doanh thu' }, { value: 'invoices', label: 'Danh sách hóa đơn' }, { value: 'stock', label: 'Tồn kho' }]} />
          <Button onClick={() => toast.show('info', 'Đã cập nhật báo cáo', `${from} — ${to}`)}>Xem báo cáo</Button>
        </div>
      </div>
      {type === 'revenue' && (
        <>
          <div className="card spot"><div className="card-head"><div><span className="eyebrow">Doanh thu 7 ngày</span><strong className="num">{vnd(dayRows.reduce((a, d) => a + d.total, 0))}</strong></div></div><RevenueChart data={week} /></div>
          <div className="card card-flush"><DataTable cols={dayCols} rows={dayRows} rowKey={(d) => d.d} /></div>
        </>
      )}
      {type === 'invoices' && <div className="card card-flush"><DataTable cols={[
        { head: 'Số hóa đơn', cell: (i) => i.id, className: 'code' },
        { head: 'Khách', cell: (i) => i.customer, className: 'strong' },
        { head: 'Tổng', cell: (i) => <span className="num">{vnd(i.total)}</span>, right: true },
        { head: 'Thanh toán', cell: (i) => ({ cash: 'Tiền mặt', wallet: 'Trừ số dư', transfer: 'Chuyển khoản' })[i.method] },
        { head: 'Trạng thái', cell: (i) => (i.status === 'paid' ? 'Đã thanh toán' : 'Đã hoàn tiền') },
        { head: 'Thời điểm', cell: (i) => stamp(i.time) },
      ]} rows={state.invoices} rowKey={(i) => i.id} /></div>}
      {type === 'stock' && <div className="card card-flush"><DataTable cols={[
        { head: 'Mã', cell: (p) => p.id, className: 'code' },
        { head: 'Sản phẩm', cell: (p) => p.name, className: 'strong' },
        { head: 'Tồn', cell: (p) => <span className="num">{num(p.stock)}</span>, right: true },
        { head: 'Tối thiểu', cell: (p) => <span className="num">{p.min}</span>, right: true },
        { head: 'Đã bán', cell: (p) => <span className="num">{p.sold}</span>, right: true },
      ]} rows={state.products} rowKey={(p) => p.id} /></div>}
    </>
  )
}
