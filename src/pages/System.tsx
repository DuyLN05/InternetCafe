import { useState } from 'react'
import { useTheme } from '../components/theme'
import { Badge, Button, DataTable, Icon, Modal, NumberField, PageHead, SearchBox, SelectField, TextField, useToast, type Col } from '../components/ui'
import { norm, num, stamp } from '../lib/format'
import { useStore } from '../lib/store'
import type { Backup, LogEntry } from '../lib/types'

/* ============================================================
   Cấu hình
   ============================================================ */
export function Settings() {
  const { state, act } = useStore()
  const { theme, setTheme } = useTheme()
  const toast = useToast()
  const s = state.settings
  const [venue, setVenue] = useState(s.venue)
  const [phone, setPhone] = useState(s.phone)
  const [address, setAddress] = useState(s.address)
  const [minMinutes, setMin] = useState<number | null>(s.minMinutes)
  const [round, setRound] = useState(String(s.roundMoney))
  const [low, setLow] = useState<number | null>(s.lowBalance)
  const [vip, setVip] = useState<number | null>(s.rateVip)
  const [std, setStd] = useState<number | null>(s.rateStd)
  const save = () => toast(act.saveSettings({ venue, phone, address, minMinutes: minMinutes ?? -1, roundMoney: parseInt(round, 10), lowBalance: low ?? 0, rateVip: vip ?? 0, rateStd: std ?? 0 }))
  // ví dụ minh họa quy tắc: 20 phút ở khu VIP
  const example = Math.ceil((Math.max(minMinutes ?? 0, 20) * (vip ?? 0)) / 60 / parseInt(round, 10)) * parseInt(round, 10)
  return (
    <>
      <PageHead eyebrow="Quản trị hệ thống" title="Cấu hình" actions={<Button icon="check" onClick={save}>Lưu thay đổi</Button>} />
      <div className="settings-grid">
        <div className="card">
          <div className="card-head"><div><span className="eyebrow">Thông tin chung</span><strong>Thông tin quán</strong></div><Icon name="settings" /></div>
          <div className="form-stack">
            <TextField label="Tên quán" value={venue} onChange={setVenue} />
            <div className="form-grid"><TextField label="Số điện thoại" value={phone} onChange={setPhone} /><TextField label="Múi giờ" value="Việt Nam (UTC+07:00)" onChange={() => {}} disabled /></div>
            <TextField label="Địa chỉ" value={address} onChange={setAddress} />
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div><span className="eyebrow">Quy tắc tính phí</span><strong>Làm tròn & phí tối thiểu</strong></div><Icon name="clock" /></div>
          <div className="form-grid">
            <NumberField label="Phút tối thiểu mỗi phiên" value={minMinutes} onChange={setMin} suffix="phút" />
            <SelectField label="Làm tròn tiền lên" value={round} onChange={setRound} options={[{ value: '100', label: '100 ₫' }, { value: '500', label: '500 ₫' }, { value: '1000', label: '1.000 ₫' }]} />
            <NumberField label="Đơn giá khu VIP" value={vip} onChange={setVip} suffix="₫/giờ" />
            <NumberField label="Đơn giá khu thường" value={std} onChange={setStd} suffix="₫/giờ" />
            <NumberField label="Ngưỡng cảnh báo số dư thấp" value={low} onChange={setLow} suffix="₫" />
          </div>
          <div className="info-note"><Icon name="info" size={15} /> Ví dụ: 20 phút ở khu VIP = {num(example)} ₫. Đơn giá của phiên được lưu lúc mở và không đổi khi cấu hình mới có hiệu lực.</div>
        </div>
        <div className="card">
          <div className="card-head"><div><span className="eyebrow">Giao diện</span><strong>Chế độ hiển thị</strong></div><Icon name={theme === 'dark' ? 'moon' : 'sun'} /></div>
          <div className="theme-cards">
            {([['dark', 'dk', 'Tối', 'Dịu mắt khi trực đêm'], ['light', 'lt', 'Sáng', 'Rõ nét giữa ban ngày']] as const).map(([k, c, n, d]) => (
              <button key={k} className={`theme-card ${c} ${theme === k ? 'active' : ''}`} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setTheme(k, { x: r.left + r.width / 2, y: r.top + r.height / 2 }) }}>
                <div className="preview"><i className="s" /><div className="m"><i /><i /><i /></div></div><strong>{n}</strong><span>{d}</span>
              </button>
            ))}
          </div>
          <div className="info-note"><Icon name="info" size={15} /> Lựa chọn được ghi nhớ trên trình duyệt này và tự theo hệ điều hành ở lần đầu.</div>
        </div>
      </div>
    </>
  )
}

/* ============================================================
   Nhật ký thao tác
   ============================================================ */
export function Audit() {
  const { state } = useStore()
  const [q, setQ] = useState('')
  const [who, setWho] = useState('all')
  const users = Array.from(new Set(state.logs.map((l) => l.user)))
  const rows = state.logs.filter((l) => (who === 'all' || l.user === who) && (!q || norm(`${l.action} ${l.target} ${l.detail}`).includes(norm(q))))
  const cols: Col<LogEntry>[] = [
    { head: 'Thời điểm', cell: (l) => stamp(l.time) },
    { head: 'Người thao tác', cell: (l) => l.user, className: 'strong' },
    { head: 'Vai trò', cell: (l) => l.role },
    { head: 'Hành động', cell: (l) => <Badge tone="cyan">{l.action}</Badge> },
    { head: 'Đối tượng', cell: (l) => l.target, className: 'code' },
    { head: 'Chi tiết', cell: (l) => l.detail },
  ]
  return (
    <>
      <PageHead eyebrow="An toàn & tuân thủ" title="Nhật ký thao tác" />
      <div className="card card-flush">
        <div className="toolbar">
          <SearchBox wide value={q} onChange={setQ} placeholder="Tìm hành động, đối tượng…" />
          <div style={{ minWidth: 220 }}><SelectField value={who} onChange={setWho} options={[{ value: 'all', label: 'Người dùng: Tất cả' }, ...users.map((u) => ({ value: u, label: u }))]} /></div>
        </div>
        <DataTable key={q + who + state.logs.length} cols={cols} rows={rows} rowKey={(l) => String(l.id)} pageSize={10} />
      </div>
    </>
  )
}

/* ============================================================
   Sao lưu & phục hồi
   ============================================================ */
export function BackupPage() {
  const { state, act } = useStore()
  const toast = useToast()
  const [restore, setRestore] = useState<Backup | null>(null)
  const latest = state.backups[0]
  const cols: Col<Backup>[] = [
    { head: 'Tên bản sao lưu', cell: (b) => b.name, className: 'strong' },
    { head: 'Thời điểm', cell: (b) => stamp(b.time) },
    { head: 'Người tạo', cell: (b) => b.by },
    { head: 'Dung lượng', cell: (b) => <span className="num">{b.size}</span> },
    { head: 'Loại', cell: (b) => b.kind },
    { head: 'Trạng thái', cell: () => <Badge tone="empty">Sẵn sàng</Badge> },
    { head: '', cell: (b) => <div className="row-actions"><Button size="sm" tone="danger" onClick={() => setRestore(b)}>Phục hồi</Button></div> },
  ]
  return (
    <>
      <PageHead eyebrow="Dữ liệu hệ thống" title="Sao lưu & phục hồi" actions={<Button icon="database" onClick={() => toast(act.createBackup())}>Tạo bản sao lưu</Button>} />
      <div className="alert-bar green"><Icon name="shield" size={26} /><div><strong>Dữ liệu được sao lưu an toàn</strong><span>Bản gần nhất: {stamp(latest.time)} · {latest.kind} · Trạng thái toàn vẹn</span></div><Badge tone="empty">Đã xác minh</Badge></div>
      <div className="card card-flush">
        <div className="card-head" style={{ padding: '18px 20px 14px', marginBottom: 0 }}><div><span className="eyebrow">Lịch sử sao lưu</span><strong>Các phiên bản gần đây</strong></div></div>
        <DataTable key={state.backups.length} cols={cols} rows={state.backups} rowKey={(b) => b.id} pageSize={6} />
      </div>
      <div className="split-actions danger-zone"><div><strong>Phục hồi cơ sở dữ liệu</strong><span>Thao tác này cần xác nhận lại và sẽ được ghi vào nhật ký hệ thống. Lịch sao lưu tự động: 03:00 hằng ngày.</span></div></div>
      {restore && <RestoreModal backup={restore} onClose={() => setRestore(null)} />}
    </>
  )
}

function RestoreModal({ backup, onClose }: { backup: Backup; onClose: () => void }) {
  const { act } = useStore()
  const toast = useToast()
  const [text, setText] = useState('')
  const ok = text.trim().toUpperCase() === 'PHUC HOI'
  return (
    <Modal size="sm" eyebrow="Phục hồi dữ liệu" title={backup.name} onClose={onClose}
      footer={(close) => <><Button tone="ghost" onClick={close}>Hủy</Button><Button tone="danger" disabled={!ok} onClick={() => { toast(act.restoreBackup(backup.id)); close() }}>Phục hồi ngay</Button></>}>
      <div className="form-stack">
        <div className="alert-bar danger" style={{ margin: 0 }}><Icon name="alert" /><div><strong>Dữ liệu hiện tại sẽ bị ghi đè</strong><span>Dữ liệu phát sinh sau {stamp(backup.time)} có thể bị mất.</span></div></div>
        <TextField label="Gõ PHUC HOI để xác nhận" value={text} onChange={setText} autoFocus />
      </div>
    </Modal>
  )
}
