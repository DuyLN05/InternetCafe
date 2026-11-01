import { useState } from 'react'
import { Badge, Button, DataTable, Icon, Modal, PageHead, SelectField, TextField, useToast, type Col } from '../components/ui'
import { useStore } from '../lib/store'
import { roleRank, type Role, type Staff } from '../lib/types'

export default function StaffPage() {
  const { state, act, user } = useStore()
  const toast = useToast()
  const [add, setAdd] = useState(false)
  const cols: Col<Staff>[] = [
    { head: 'Mã NV', cell: (s) => s.id, className: 'code' },
    { head: 'Họ và tên', cell: (s) => s.name, className: 'strong' },
    { head: 'Tên đăng nhập', cell: (s) => s.username },
    { head: 'Vai trò', cell: (s) => <Badge tone={s.role === 'Quản trị viên' ? 'purple' : s.role === 'Quản lý' ? 'cyan' : 'muted'}>{s.role}</Badge> },
    { head: 'Ca hiện tại', cell: (s) => (state.shift.status === 'open' && state.shift.user === s.name ? 'Đang mở ca' : '—') },
    { head: 'Trạng thái', cell: (s) => (s.active ? <Badge tone="empty">Hoạt động</Badge> : <Badge tone="muted">Đã khóa</Badge>) },
    { head: '', cell: (s) => <div className="row-actions"><Button size="sm" tone="ghost" disabled={s.username === user.username} onClick={() => toast(act.toggleStaff(s.id))}>{s.active ? 'Khóa' : 'Mở khóa'}</Button></div> },
  ]
  return (
    <>
      <PageHead eyebrow="Hệ thống" title="Nhân viên & phân quyền" actions={<Button icon="plus" onClick={() => setAdd(true)}>Thêm nhân viên</Button>} />
      <div className="card card-flush"><DataTable cols={cols} rows={state.staff} rowKey={(s) => s.id} /></div>
      <div className="role-cards">
        {([['Thu ngân', 'Mở/kết thúc phiên, bán hàng, nạp ví, lập hóa đơn, báo sự cố, mở/kết ca.'], ['Quản lý', 'Toàn bộ quyền Thu ngân + kho, sản phẩm, hoàn tiền, xử lý bảo trì, nhân viên, báo cáo.'], ['Quản trị viên', 'Toàn bộ quyền Quản lý + cấu hình quy tắc phí, nhật ký, sao lưu/phục hồi.']] as [Role, string][]).map(([r, d]) => (
          <div className="card spot" key={r}><div className="card-head" style={{ marginBottom: 8 }}><div><span className="eyebrow">Vai trò</span><strong>{r}</strong></div></div><p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7 }}>{d}</p></div>
        ))}
      </div>
      <div className="note-line"><Icon name="shield" size={15} /> Quyền được kiểm tra ở cả giao diện và máy chủ. Quản trị viên mới được cấp vai trò Quản trị viên.</div>
      {add && <AddStaffModal onClose={() => setAdd(false)} canAdmin={roleRank[user.role] >= 2} />}
    </>
  )
}

function AddStaffModal({ onClose, canAdmin }: { onClose: () => void; canAdmin: boolean }) {
  const { act } = useStore()
  const toast = useToast()
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [role, setRole] = useState<Role>('Thu ngân')
  return (
    <Modal size="sm" eyebrow="Hệ thống" title="Thêm nhân viên" onClose={onClose}
      footer={(close) => <><Button tone="ghost" onClick={close}>Hủy</Button><Button onClick={() => { const r = act.addStaff({ name, username: username.trim().toLowerCase(), role }); toast(r); if (r.ok) close() }}>Tạo tài khoản</Button></>}>
      <div className="form-stack">
        <TextField label="Họ và tên" icon="user" value={name} onChange={setName} autoFocus />
        <TextField label="Tên đăng nhập" icon="key" value={username} onChange={setUsername} hint="Chữ thường, số, dấu chấm hoặc gạch dưới" />
        <SelectField label="Vai trò" value={role} onChange={(v) => setRole(v as Role)} options={[{ value: 'Thu ngân', label: 'Thu ngân' }, { value: 'Quản lý', label: 'Quản lý' }, { value: 'Quản trị viên', label: 'Quản trị viên', disabled: !canAdmin }]} />
      </div>
    </Modal>
  )
}
