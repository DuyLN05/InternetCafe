import { useRef, useState } from 'react'
import { Button, Icon, Modal, PageHead, SelectField, TextArea, TextField, useToast } from '../components/ui'
import { vnd } from '../lib/format'
import { imgSrc } from '../lib/remote'
import { NAV, type PageId } from '../lib/nav'
import { shiftTotals, useStore } from '../lib/store'
import { roleRank, type Game } from '../lib/types'
import BannerSection from './Banners'
import { ImagePicker } from './Catalog'

const GROUP_TONE: Record<string, string> = {
  'VẬN HÀNH': '88, 101, 242',
  'KINH DOANH': '168, 85, 247',
  'PHÂN TÍCH': '16, 185, 129',
  'HỆ THỐNG': '236, 72, 153',
}

/** Thẻ "đèn chiếu" — di chuột để bật đèn, màu theo nhóm chức năng */
function LightCard({ id, label, icon, hint, tone, meta, onGo }: { id: PageId; label: string; icon: string; hint: string; tone: string; meta?: string; onGo: (p: PageId) => void }) {
  return (
    <div className="light-button" style={{ ['--lc' as string]: tone }}>
      <button className="bt" onClick={() => onGo(id)} aria-label={`${label}. ${hint}`}>
        <div className="light-holder"><div className="dot" /><div className="light" /></div>
        <div className="button-holder">
          <Icon name={icon} size={34} />
          <p>{label}</p>
          {meta && <em>{meta}</em>}
        </div>
      </button>
      <span className="light-hint">{hint}</span>
    </div>
  )
}

export default function Hub({ go }: { go: (p: PageId) => void }) {
  const { state, user } = useStore()
  const t = shiftTotals(state)
  const using = state.machines.filter((m) => m.state === 'using').length
  const newOrders = state.orders.filter((o) => o.status === 'Mới').length
  const openTickets = state.tickets.filter((x) => x.status === 'open').length
  const lowStock = state.products.filter((p) => p.stock <= p.min).length

  const meta: Partial<Record<PageId, string>> = {
    machines: `${using}/${state.machines.length} đang dùng`,
    orders: newOrders ? `${newOrders} đơn mới` : undefined,
    maintenance: openTickets ? `${openTickets} phiếu mở` : undefined,
    inventory: lowStock ? `${lowStock} sắp hết` : undefined,
    members: `${state.members.length} hội viên`,
    products: `${state.products.length} món`,
    staff: `${state.staff.filter((s) => s.active).length} đang làm`,
  }

  const items = NAV.filter((n) => n.id !== 'hub' && roleRank[user.role] >= roleRank[n.min])
  const groups = Array.from(new Set(items.map((n) => n.group)))
  const hour = new Date().getHours()
  const greet = hour < 11 ? 'Chào buổi sáng' : hour < 14 ? 'Chào buổi trưa' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'

  return (
    <>
      <PageHead eyebrow="TỔNG HỢP · LỐI TẮT" title={`${greet}, ${user.name.split(' ').slice(-1)[0]}`} sub="Chọn một khu vực để bắt đầu — thẻ sẽ sáng lên khi bạn di chuột vào." />
      <BannerSection />
      <GamesSection />
      <div className="hub-strip">
        <div><small>MÁY ĐANG DÙNG</small><strong>{using}<i>/{state.machines.length}</i></strong></div>
        <div><small>DOANH THU CA</small><strong>{vnd(t.revenue)}</strong></div>
        <div><small>ĐƠN CHỜ</small><strong>{newOrders}</strong></div>
        <div><small>CA LÀM VIỆC</small><strong className={state.shift.status === 'open' ? 'ok' : ''}>{state.shift.status === 'open' ? 'Đang mở' : 'Đã kết'}</strong></div>
      </div>
      {groups.map((g) => (
        <section key={g} className="hub-group" style={{ ['--lc' as string]: GROUP_TONE[g] }}>
          <h2 className="hub-title"><span />{g}</h2>
          <div className="hub-grid">
            {items.filter((n) => n.group === g).map((n) => <LightCard key={n.id} id={n.id} label={n.label} icon={n.icon} hint={n.hint} tone={GROUP_TONE[g]} meta={meta[n.id]} onGo={go} />)}
          </div>
        </section>
      ))}
    </>
  )
}

/* ============================================================
   Tựa game có sẵn — thẻ sóng + tia sét, thêm/sửa/xóa được
   ============================================================ */
const TONES: { value: Game['tone']; label: string }[] = [
  { value: 'violet', label: 'Tím' }, { value: 'cyan', label: 'Xanh lơ' }, { value: 'magenta', label: 'Hồng' }, { value: 'green', label: 'Xanh lá' }, { value: 'amber', label: 'Cam' },
]
const ZONES: Game['zone'][] = ['Tất cả máy', 'Khu VIP', 'Khu thường']

function GameCard({ g, canEdit, onEdit, onDelete }: { g: Game; canEdit: boolean; onEdit: () => void; onDelete: () => void }) {
  return (
    <article data-gid={g.id} className={`e-card playing tone-${g.tone} ${g.image ? 'has-img' : ''}`}>
      {g.image && <img className="image" src={imgSrc(g.image)} alt="" draggable={false} loading="lazy" />}
      <div className="wave" /><div className="wave" /><div className="wave" />
      <div className="shade" />
      <div className="g-info">
        <div className="g-top"><span className="name">{g.genre}</span><span className="g-zone">{g.zone}</span></div>
        <h3>{g.name}</h3>
        <p>{g.desc}</p>
      </div>
      {canEdit && (
        <div className="g-actions">
          <button onClick={onEdit} title="Sửa game" aria-label={`Sửa ${g.name}`}><Icon name="edit" size={15} /></button>
          <button onClick={onDelete} title="Xóa game" aria-label={`Xóa ${g.name}`}><Icon name="trash" size={15} /></button>
        </div>
      )}
    </article>
  )
}

function GameModal({ id, onClose }: { id?: string; onClose: () => void }) {
  const { state, act } = useStore()
  const toast = useToast()
  const cur = id ? state.games.find((g) => g.id === id) : undefined
  const [name, setName] = useState(cur?.name ?? '')
  const [genre, setGenre] = useState(cur?.genre ?? '')
  const [desc, setDesc] = useState(cur?.desc ?? '')
  const [zone, setZone] = useState<Game['zone']>(cur?.zone ?? 'Tất cả máy')
  const [tone, setTone] = useState<Game['tone']>(cur?.tone ?? 'violet')
  const [image, setImage] = useState<string | undefined>(cur?.image)
  const submit = (close: () => void) => {
    const body = { name, genre, desc, zone, tone, image }
    const r = cur ? act.updateGame({ ...body, id: cur.id }) : act.addGame(body)
    toast(r); if (r.ok) close()
  }
  return (
    <Modal size="lg" eyebrow="Thư viện game" title={cur ? `Sửa game · ${cur.id}` : 'Thêm game'} onClose={onClose}
      footer={(close) => <><Button tone="ghost" onClick={close}>Hủy</Button><Button onClick={() => submit(close)}>{cur ? 'Lưu thay đổi' : 'Thêm game'}</Button></>}>
      <ImagePicker max={1000} quality={0.9} title="Ảnh game" name={name || 'Game mới'} cat="Game" value={image} onChange={setImage} />
      <div className="form-grid" style={{ marginTop: 18 }}>
        <div style={{ gridColumn: '1 / -1' }}><TextField label="Tên game" value={name} onChange={setName} autoFocus={!cur} placeholder="VD: Dota 2" /></div>
        <TextField label="Thể loại" value={genre} onChange={setGenre} placeholder="VD: MOBA, FPS…" />
        <SelectField label="Cài trên" value={zone} onChange={(v) => setZone(v as Game['zone'])} options={ZONES.map((z) => ({ value: z, label: z }))} />
        <div style={{ gridColumn: '1 / -1' }}><TextArea label="Giới thiệu ngắn" value={desc} onChange={setDesc} placeholder="Mô tả vài dòng về game, cấu hình, ghi chú cho khách…" /></div>
        <div style={{ gridColumn: '1 / -1' }}>
          <div className="choice-title" style={{ marginTop: 0 }}>Màu thẻ</div>
          <div className="tone-picks">{TONES.map((t) => <button key={t.value} type="button" className={`tone-dot tone-${t.value} ${tone === t.value ? 'on' : ''}`} onClick={() => setTone(t.value)} aria-label={t.label} aria-pressed={tone === t.value} title={t.label} />)}</div>
        </div>
      </div>
    </Modal>
  )
}

export function GamesSection() {
  const { state, user, act } = useStore()
  const toast = useToast()
  const canEdit = roleRank[user.role] >= 1
  const [modal, setModal] = useState<null | { id?: string }>(null)
  const [del, setDel] = useState<Game | null>(null)
  const rail = useRef<HTMLDivElement>(null)
  const scroll = (d: number) => rail.current?.scrollBy({ left: d * 264, behavior: 'smooth' })
  return (
    <section className="hub-group games" style={{ ['--lc' as string]: '0, 229, 255' }}>
      <div className="games-head">
        <h2 className="hub-title"><span />TỰA GAME CÓ SẴN · {state.games.length}</h2>
        <div className="games-nav">
          <button onClick={() => scroll(-1)} aria-label="Cuộn trái"><Icon name="arrow" size={16} /></button>
          <button onClick={() => scroll(1)} aria-label="Cuộn phải"><Icon name="arrow" size={16} /></button>
        </div>
        {canEdit && <Button size="sm" icon="plus" tone="secondary" onClick={() => setModal({})}>Thêm game</Button>}
      </div>
      <div className="games-grid" ref={rail} tabIndex={0} aria-label="Danh sách game, cuộn ngang">
        {state.games.map((g) => <GameCard key={g.id} g={g} canEdit={canEdit} onEdit={() => setModal({ id: g.id })} onDelete={() => setDel(g)} />)}
        {!state.games.length && <div className="empty-state" style={{ gridColumn: '1 / -1' }}><strong>Chưa có game nào</strong>{canEdit && <span>Bấm “Thêm game” để giới thiệu tựa game của quán.</span>}</div>}
      </div>
      {modal && <GameModal id={modal.id} onClose={() => setModal(null)} />}
      {del && (
        <Modal size="sm" eyebrow="Xác nhận" title="Xóa game?" onClose={() => setDel(null)}
          footer={(close) => <><Button tone="ghost" onClick={close}>Giữ lại</Button><Button tone="danger" onClick={() => { toast(act.deleteGame(del.id)); close() }}>Xóa</Button></>}>
          <p>Bạn muốn xóa <strong>{del.name}</strong> khỏi danh sách giới thiệu? Thao tác được ghi vào nhật ký.</p>
        </Modal>
      )}
    </section>
  )
}
