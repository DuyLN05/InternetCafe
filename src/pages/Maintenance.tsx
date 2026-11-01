import { useState } from 'react'
import { Badge, Button, DataTable, Icon, Modal, PageHead, SelectField, TextArea, TextField, useToast, type Col } from '../components/ui'
import { stamp } from '../lib/format'
import type { PageId } from '../lib/nav'
import { useStore } from '../lib/store'
import { roleRank, type Ticket } from '../lib/types'

export default function Maintenance({ go }: { go: (p: PageId) => void }) {
  const { state, user } = useStore()
  const [report, setReport] = useState(false)
  const [close, setClose] = useState<Ticket | null>(null)
  const isMgr = roleRank[user.role] >= 1
  const cols: Col<Ticket>[] = [
    { head: 'Mã phiếu', cell: (t) => t.id, className: 'code' },
    { head: 'Máy', cell: (t) => t.machineId, className: 'strong' },
    { head: 'Sự cố', cell: (t) => t.issue },
    { head: 'Người phụ trách', cell: (t) => t.assignee },
    { head: 'Cập nhật', cell: (t) => stamp(t.time) },
    { head: 'Kết quả', cell: (t) => t.result ?? '—' },
    { head: 'Trạng thái', cell: (t) => t.status === 'open' ? <Badge tone="amber">Đang xử lý</Badge> : <Badge tone="empty">Đã đóng</Badge> },
    { head: '', cell: (t) => t.status === 'open' && <div className="row-actions"><Button size="sm" tone="secondary" disabled={!isMgr} title={isMgr ? undefined : 'Cần quyền Quản lý'} onClick={() => setClose(t)}>Đóng phiếu</Button></div> },
  ]
  return (
    <>
      <PageHead eyebrow="Thiết bị" title="Phiếu bảo trì" actions={<Button icon="alert" onClick={() => setReport(true)}>Báo sự cố</Button>} />
      <div className="card card-flush">
        <DataTable cols={cols} rows={state.tickets} rowKey={(t) => t.id} />
      </div>
      <div className="split-actions">
        <div><strong>Quản lý máy & đơn giá</strong><span>Đơn giá theo khu được thiết lập trong Cấu hình. Máy có lịch sử chỉ được ngừng sử dụng.</span></div>
        <Button tone="secondary" onClick={() => go('machines')}>Quản lý máy</Button>
      </div>
      {report && <ReportModal onClose={() => setReport(false)} />}
      {close && <CloseModal ticket={close} onClose={() => setClose(null)} />}
    </>
  )
}

function ReportModal({ onClose }: { onClose: () => void }) {
  const { state, act } = useStore()
  const toast = useToast()
  const options = state.machines.filter((m) => m.state === 'empty')
  const [mid, setMid] = useState(options[0]?.id ?? '')
  const [issue, setIssue] = useState('')
  return (
    <Modal size="sm" eyebrow="Báo sự cố" title="Tạo phiếu bảo trì" onClose={onClose}
      footer={(close) => <><Button tone="ghost" onClick={close}>Hủy</Button><Button disabled={!options.length} onClick={() => { const r = act.reportIssue({ machineId: mid, issue }); toast(r); if (r.ok) close() }}>Gửi phiếu</Button></>}>
      <div className="form-stack">
        {options.length ? <SelectField label="Máy gặp sự cố" value={mid} onChange={setMid} options={options.map((m) => ({ value: m.id, label: `${m.id} · Khu ${m.zone}` }))} hint="Chỉ máy đang trống mới có thể chuyển sang bảo trì." /> : <div className="alert-bar"><Icon name="alert" /><div><strong>Không có máy trống</strong><span>Hãy kết thúc phiên trên máy gặp sự cố trước.</span></div></div>}
        <TextArea label="Mô tả sự cố" value={issue} onChange={setIssue} placeholder="VD: Màn hình nhấp nháy, không nhận chuột…" />
      </div>
    </Modal>
  )
}

function CloseModal({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const { act } = useStore()
  const toast = useToast()
  const [result, setResult] = useState('')
  return (
    <Modal size="sm" eyebrow={`Đóng phiếu ${ticket.id}`} title={`${ticket.machineId} · ${ticket.issue}`} onClose={onClose}
      footer={(close) => <><Button tone="ghost" onClick={close}>Hủy</Button><Button onClick={() => { const r = act.closeTicket(ticket.id, result); toast(r); if (r.ok) close() }}>Đóng phiếu & mở lại máy</Button></>}>
      <TextField label="Kết quả xử lý" value={result} onChange={setResult} placeholder="VD: Thay bàn phím mới" autoFocus />
    </Modal>
  )
}
