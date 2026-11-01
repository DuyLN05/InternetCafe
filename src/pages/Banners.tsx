import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { Button, Icon, Modal, SelectField, TextField, useToast } from '../components/ui'
import { imgSrc } from '../lib/remote'
import { useStore } from '../lib/store'
import { roleRank, type Banner, type Game } from '../lib/types'
import { ImagePicker } from './Catalog'

const TONES: { value: Game['tone']; label: string }[] = [
  { value: 'violet', label: 'Tím' }, { value: 'cyan', label: 'Xanh lơ' }, { value: 'magenta', label: 'Hồng' }, { value: 'green', label: 'Xanh lá' }, { value: 'amber', label: 'Cam' },
]
const DELAY = 6500

function BannerModal({ id, onClose }: { id?: string; onClose: () => void }) {
  const { state, act } = useStore()
  const toast = useToast()
  const cur = id ? state.banners.find((b) => b.id === id) : undefined
  const [tag, setTag] = useState(cur?.tag ?? 'GAME MỚI')
  const [title, setTitle] = useState(cur?.title ?? '')
  const [subtitle, setSubtitle] = useState(cur?.subtitle ?? '')
  const [cta, setCta] = useState(cur?.cta ?? 'Xem ngay')
  const [tone, setTone] = useState<Game['tone']>(cur?.tone ?? 'violet')
  const [gameId, setGameId] = useState(cur?.gameId ?? '')
  const [image, setImage] = useState<string | undefined>(cur?.image)
  const submit = (close: () => void) => {
    const body = { tag, title, subtitle, cta, tone, image, gameId: gameId || undefined }
    const r = cur ? act.updateBanner({ ...body, id: cur.id }) : act.addBanner(body)
    toast(r); if (r.ok) close()
  }
  return (
    <Modal size="lg" eyebrow="Quảng cáo" title={cur ? `Sửa banner · ${cur.id}` : 'Thêm banner'} onClose={onClose}
      footer={(close) => <><Button tone="ghost" onClick={close}>Hủy</Button><Button onClick={() => submit(close)}>{cur ? 'Lưu thay đổi' : 'Thêm banner'}</Button></>}>
      <ImagePicker max={2200} quality={0.92} title="Ảnh bìa banner" name={title || 'Banner mới'} cat="Game" value={image} onChange={setImage} />
      <p className="bn-hint">Gợi ý: ảnh bìa ngang (tỉ lệ khoảng 16:5, ví dụ 1920×600; web giữ tối đa 2200px để ảnh sắc nét). Chưa có ảnh thì banner dùng nền hiệu ứng theo màu đã chọn.</p>
      <div className="form-grid" style={{ marginTop: 8 }}>
        <TextField label="Nhãn" value={tag} onChange={setTag} placeholder="GAME MỚI, SỰ KIỆN…" />
        <TextField label="Chữ trên nút" value={cta} onChange={setCta} placeholder="Xem ngay" />
        <div style={{ gridColumn: '1 / -1' }}><TextField label="Tiêu đề" value={title} onChange={setTitle} autoFocus={!cur} placeholder="VD: Dota 2 chính thức có mặt tại AltF4" /></div>
        <div style={{ gridColumn: '1 / -1' }}><TextField label="Mô tả ngắn" value={subtitle} onChange={setSubtitle} placeholder="Một hai câu giới thiệu…" /></div>
        <SelectField label="Game liên kết" value={gameId} onChange={setGameId} options={[{ value: '', label: 'Không liên kết' }, ...state.games.map((g) => ({ value: g.id, label: g.name }))]} />
        <div>
          <div className="choice-title" style={{ marginTop: 0 }}>Màu hiệu ứng</div>
          <div className="tone-picks">{TONES.map((t) => <button key={t.value} type="button" className={`tone-dot tone-${t.value} ${tone === t.value ? 'on' : ''}`} onClick={() => setTone(t.value)} aria-label={t.label} aria-pressed={tone === t.value} title={t.label} />)}</div>
        </div>
      </div>
    </Modal>
  )
}

/** Banner quảng cáo cỡ ảnh bìa: tự chạy, kéo bằng mũi tên/chấm, hiệu ứng parallax + ken-burns + quét sáng */
export default function BannerSection() {
  const { state, user, act } = useStore()
  const toast = useToast()
  const canEdit = roleRank[user.role] >= 1
  const list = state.banners
  const [i, setI] = useState(0)
  const [hover, setHover] = useState(false)
  const [modal, setModal] = useState<null | { id?: string }>(null)
  const [del, setDel] = useState<Banner | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const n = list.length
  const idx = n ? Math.min(i, n - 1) : 0
  const cur = list[idx]
  const go = useCallback((d: number) => setI((v) => (n ? (v + d + n) % n : 0)), [n])

  useEffect(() => {
    if (n < 2 || hover || modal || del) return
    const t = window.setTimeout(() => go(1), DELAY)
    return () => window.clearTimeout(t)
  }, [idx, n, hover, modal, del, go])

  const move = (e: RPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    box.current?.style.setProperty('--px', String((e.clientX - r.left) / r.width - 0.5))
    box.current?.style.setProperty('--py', String((e.clientY - r.top) / r.height - 0.5))
    // làm tròn về số nguyên px để ảnh không bị mờ do dịch nửa điểm ảnh
    box.current?.style.setProperty('--tx', `${Math.round(-((e.clientX - r.left) / r.width - 0.5) * 16)}px`)
    box.current?.style.setProperty('--ty', `${Math.round(-((e.clientY - r.top) / r.height - 0.5) * 8)}px`)
  }
  const open = (b: Banner) => {
    if (!b.gameId) return
    const el = document.querySelector<HTMLElement>(`[data-gid="${b.gameId}"]`)
    if (!el) { toast({ ok: false, msg: 'Game liên kết không còn trong danh sách.' }); return }
    el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash')
  }

  if (!n && !canEdit) return null
  return (
    <section className="bn-wrap">
      {!n ? (
        <button className="bn-empty" onClick={() => setModal({})}><Icon name="plus" size={20} />Thêm banner quảng cáo đầu tiên</button>
      ) : (
        <div ref={box} className={`bn tone-${cur.tone}`} onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)} onPointerMove={move} role="region" aria-roledescription="carousel" aria-label="Banner quảng cáo">
          {list.map((b, k) => (
            <div key={b.id} className={`bn-slide tone-${b.tone} ${k === idx ? 'on' : ''}`} aria-hidden={k !== idx}>
              <div className="bn-bg">
                {b.image ? <img src={imgSrc(b.image)} alt="" draggable={false} /> : <><i className="bn-orb a" /><i className="bn-orb b" /><i className="bn-orb c" /></>}
              </div>
              <div className="bn-grid" />
              <div className="bn-copy">
                <span className="bn-tag"><i />{b.tag}</span>
                <h2 data-text={b.title}>{b.title}</h2>
                {b.subtitle && <p>{b.subtitle}</p>}
                {b.cta && <button className="bn-cta" onClick={() => open(b)} tabIndex={k === idx ? 0 : -1}>{b.cta}<Icon name="arrow" size={16} /></button>}
              </div>
            </div>
          ))}
          <div className="bn-shine" />
          {n > 1 && <>
            <button className="bn-arrow l" onClick={() => go(-1)} aria-label="Banner trước"><Icon name="arrow" size={18} /></button>
            <button className="bn-arrow r" onClick={() => go(1)} aria-label="Banner sau"><Icon name="arrow" size={18} /></button>
            <div className="bn-dots">
              {list.map((b, k) => <button key={b.id} className={k === idx ? 'on' : ''} onClick={() => setI(k)} aria-label={`Banner ${k + 1}: ${b.title}`}><i key={k === idx ? idx : 'x'} style={{ animationDuration: `${DELAY}ms`, animationPlayState: hover ? 'paused' : 'running' }} /></button>)}
            </div>
          </>}
          {canEdit && (
            <div className="bn-tools">
              <button onClick={() => setModal({})} title="Thêm banner" aria-label="Thêm banner"><Icon name="plus" size={16} /></button>
              <button onClick={() => setModal({ id: cur.id })} title="Sửa banner này" aria-label="Sửa banner này"><Icon name="edit" size={16} /></button>
              <button onClick={() => setDel(cur)} title="Xóa banner này" aria-label="Xóa banner này"><Icon name="trash" size={16} /></button>
            </div>
          )}
        </div>
      )}
      {modal && <BannerModal id={modal.id} onClose={() => setModal(null)} />}
      {del && (
        <Modal size="sm" eyebrow="Xác nhận" title="Xóa banner?" onClose={() => setDel(null)}
          footer={(close) => <><Button tone="ghost" onClick={close}>Giữ lại</Button><Button tone="danger" onClick={() => { toast(act.deleteBanner(del.id)); close() }}>Xóa</Button></>}>
          <p>Bạn muốn xóa banner <strong>{del.title}</strong>? Thao tác được ghi vào nhật ký.</p>
        </Modal>
      )}
    </section>
  )
}
