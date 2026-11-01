import { useRef, useState } from 'react'
import { Badge, Button, DataTable, Icon, Modal, NumberField, ProductArt, PageHead, SearchBox, SelectField, Stat, Tabs, TextField, useToast, type Col } from '../components/ui'
import { norm, num, stamp, vnd } from '../lib/format'
import { compressImage } from '../lib/image'
import { useStore } from '../lib/store'
import { roleRank, type Product, type StockMove, type Supplier } from '../lib/types'

const stockBadge = (p: Product) => p.stock === 0 ? <Badge tone="danger">Hết hàng</Badge> : p.stock <= p.min ? <Badge tone="amber">Sắp hết</Badge> : <Badge tone="empty">Đủ hàng</Badge>

/* ============================================================
   Sản phẩm — menu dạng thẻ có ảnh (hoặc bảng)
   ============================================================ */
const CATS: Product['cat'][] = ['Nước giải khát', 'Đồ ăn', 'Thẻ & phụ kiện']

export function Products() {
  const { state, user, act } = useStore()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<'all' | Product['cat']>('all')
  const [view, setView] = useState<'menu' | 'table'>(() => { try { return localStorage.getItem('altf4-pview') === 'table' ? 'table' : 'menu' } catch { return 'menu' } })
  const [modal, setModal] = useState<null | { t: 'add' } | { t: 'edit'; id: string }>(null)
  const quick = useRef<HTMLInputElement>(null)
  const quickId = useRef('')
  const isMgr = roleRank[user.role] >= 1
  const rows = state.products.filter((p) => (cat === 'all' || p.cat === cat) && (!q || norm(`${p.id} ${p.name}`).includes(norm(q))))
  const setV = (v: 'menu' | 'table') => { setView(v); try { localStorage.setItem('altf4-pview', v) } catch { /* bỏ qua */ } }
  const withImg = state.products.filter((p) => p.image).length

  const pickQuick = (id: string) => { quickId.current = id; quick.current?.click() }
  const onQuickFile = async (f?: File) => {
    if (!f) return
    try { toast(act.setProductImage(quickId.current, await compressImage(f))) } catch (e) { toast({ ok: false, msg: (e as Error).message }) }
    if (quick.current) quick.current.value = ''
  }

  const cols: Col<Product>[] = [
    { head: '', cell: (p) => <ProductArt name={p.name} cat={p.cat} image={p.image} className="mini" /> },
    { head: 'Mã SP', cell: (p) => p.id, className: 'code' },
    { head: 'Sản phẩm', cell: (p) => p.name, className: 'strong' },
    { head: 'Danh mục', cell: (p) => p.cat },
    { head: 'Giá bán', cell: (p) => <span className="num">{vnd(p.price)}</span>, right: true },
    { head: 'Tồn kho', cell: (p) => <span className="num">{p.stock}</span>, right: true },
    { head: 'Đã bán', cell: (p) => <span className="num">{p.sold}</span>, right: true },
    { head: 'Trạng thái', cell: (p) => stockBadge(p) },
    ...(isMgr ? [{ head: '', cell: (p: Product) => <button className="icon-btn sm" aria-label={`Sửa ${p.name}`} onClick={() => setModal({ t: 'edit', id: p.id })}><Icon name="edit" size={16} /></button>, right: true } as Col<Product>] : []),
  ]
  return (
    <>
      <PageHead eyebrow="Danh mục · Menu" title="Sản phẩm" sub={`${state.products.length} món · ${withImg} món đã có ảnh thật${isMgr ? ' — bấm vào thẻ để sửa hoặc đổi ảnh.' : ''}`} actions={<Button icon="plus" disabled={!isMgr} onClick={() => setModal({ t: 'add' })}>Thêm sản phẩm</Button>} />
      <div className="card card-flush">
        <div className="toolbar">
          <Tabs value={cat} onChange={setCat} items={[{ value: 'all', label: 'Tất cả', count: state.products.length }, ...CATS.map((c) => ({ value: c, label: c, count: state.products.filter((p) => p.cat === c).length }))]} />
          <div className="toolbar-right">
            <div className="view-toggle" role="group" aria-label="Kiểu hiển thị">
              <button className={view === 'menu' ? 'on' : ''} onClick={() => setV('menu')} aria-pressed={view === 'menu'} title="Dạng menu có ảnh"><Icon name="grid" size={16} /></button>
              <button className={view === 'table' ? 'on' : ''} onClick={() => setV('table')} aria-pressed={view === 'table'} title="Dạng bảng"><Icon name="log" size={16} /></button>
            </div>
            <SearchBox value={q} onChange={setQ} placeholder="Tìm sản phẩm…" />
          </div>
        </div>
        {view === 'table'
          ? <DataTable key={cat + q + state.products.length} cols={cols} rows={rows} rowKey={(p) => p.id} />
          : (
            <div className="menu-grid" key={cat + q}>
              {rows.map((p, i) => (
                <article key={p.id} className={`menu-card ${p.stock === 0 ? 'soldout' : ''}`} style={{ ['--i' as string]: Math.min(i, 14) }}>
                  <div className="menu-pic">
                    <ProductArt name={p.name} cat={p.cat} image={p.image} />
                    {p.stock === 0 ? <span className="menu-flag danger">Hết hàng</span> : p.stock <= p.min ? <span className="menu-flag amber">Sắp hết · {p.stock}</span> : null}
                    {isMgr && (
                      <div className="menu-actions">
                        <button onClick={() => pickQuick(p.id)} title={p.image ? 'Đổi ảnh' : 'Thêm ảnh'} aria-label={`${p.image ? 'Đổi' : 'Thêm'} ảnh ${p.name}`}><Icon name={p.image ? 'image' : 'upload'} size={16} /></button>
                        <button onClick={() => setModal({ t: 'edit', id: p.id })} title="Sửa sản phẩm" aria-label={`Sửa ${p.name}`}><Icon name="edit" size={16} /></button>
                      </div>
                    )}
                  </div>
                  <div className="menu-body">
                    <span className="menu-cat">{p.cat}</span>
                    <strong>{p.name}</strong>
                    <div className="menu-foot"><b className="num">{vnd(p.price)}</b><small>Đã bán {p.sold}</small></div>
                  </div>
                </article>
              ))}
              {!rows.length && <div className="empty-state" style={{ gridColumn: '1 / -1' }}><strong>Không có sản phẩm phù hợp</strong></div>}
            </div>
          )}
      </div>
      <input ref={quick} type="file" accept="image/*" hidden onChange={(e) => onQuickFile(e.target.files?.[0])} />
      <div className="note-line"><Icon name="shield" size={15} /> Giá bán được lưu vào từng đơn hàng tại thời điểm bán — đổi giá không ảnh hưởng đơn cũ. Ảnh được nén tự động trước khi lưu.</div>
      {modal && <ProductModal id={modal.t === 'edit' ? modal.id : undefined} onClose={() => setModal(null)} />}
    </>
  )
}

/** Chọn ảnh: bấm, kéo-thả hoặc dán (Ctrl+V) */
export function ImagePicker({ name, cat, value, onChange }: { name: string; cat: string; value?: string; onChange: (v?: string) => void }) {
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)
  const take = async (f?: File | null) => {
    if (!f) return
    setBusy(true)
    try { onChange(await compressImage(f)) } catch (e) { toast({ ok: false, msg: (e as Error).message }) }
    setBusy(false)
    if (input.current) input.current.value = ''
  }
  return (
    <div className="img-picker">
      <div className={`img-drop ${drag ? 'drag' : ''} ${busy ? 'busy' : ''}`} tabIndex={0} role="button" aria-label="Chọn ảnh sản phẩm"
        onClick={() => input.current?.click()} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), input.current?.click())}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files?.[0]) }}
        onPaste={(e) => take(Array.from(e.clipboardData.files).find((f) => f.type.startsWith('image/')))}>
        <ProductArt name={name || 'Sản phẩm mới'} cat={cat} image={value} />
        <span className="img-hint"><Icon name="upload" size={18} />{busy ? 'Đang xử lý…' : value ? 'Bấm để đổi ảnh' : 'Bấm, kéo thả hoặc dán ảnh'}</span>
      </div>
      <div className="img-side">
        <strong>Ảnh sản phẩm</strong>
        <p>JPG, PNG hoặc WebP. Ảnh vuông hoặc ngang 4:3 hiển thị đẹp nhất — hệ thống tự nén cho nhẹ.</p>
        <div className="button-row">
          <Button tone="secondary" size="sm" icon="upload" onClick={() => input.current?.click()}>{value ? 'Chọn ảnh khác' : 'Tải ảnh lên'}</Button>
          {value && <Button tone="ghost" size="sm" icon="trash" onClick={() => onChange(undefined)}>Xóa ảnh</Button>}
        </div>
        {!value && <small>Chưa có ảnh — đang dùng tranh minh họa mặc định.</small>}
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => take(e.target.files?.[0])} />
    </div>
  )
}

function ProductModal({ id, onClose }: { id?: string; onClose: () => void }) {
  const { state, act } = useStore()
  const toast = useToast()
  const cur = id ? state.products.find((p) => p.id === id) : undefined
  const [name, setName] = useState(cur?.name ?? '')
  const [cat, setCat] = useState<Product['cat']>(cur?.cat ?? 'Nước giải khát')
  const [price, setPrice] = useState<number | null>(cur?.price ?? null)
  const [stock, setStock] = useState<number | null>(0)
  const [min, setMin] = useState<number | null>(cur?.min ?? 5)
  const [image, setImage] = useState<string | undefined>(cur?.image)
  const submit = (close: () => void) => {
    const r = cur
      ? act.updateProduct({ id: cur.id, name, cat, price: price ?? 0, min: min ?? 0, image })
      : act.addProduct({ name, cat, price: price ?? 0, stock: stock ?? 0, min: min ?? 0, image })
    toast(r); if (r.ok) close()
  }
  return (
    <Modal size="lg" eyebrow="Danh mục" title={cur ? `Sửa sản phẩm · ${cur.id}` : 'Thêm sản phẩm'} onClose={onClose}
      footer={(close) => <><Button tone="ghost" onClick={close}>Hủy</Button><Button onClick={() => submit(close)}>{cur ? 'Lưu thay đổi' : 'Lưu sản phẩm'}</Button></>}>
      <ImagePicker name={name} cat={cat} value={image} onChange={setImage} />
      <div className="form-grid" style={{ marginTop: 18 }}>
        <div style={{ gridColumn: '1 / -1' }}><TextField label="Tên sản phẩm" value={name} onChange={setName} autoFocus={!cur} placeholder="VD: Trà sữa trân châu" /></div>
        <SelectField label="Danh mục" value={cat} onChange={(v) => setCat(v as Product['cat'])} options={CATS.map((c) => ({ value: c, label: c }))} />
        <NumberField label="Giá bán" suffix="₫" value={price} onChange={setPrice} />
        {!cur && <NumberField label="Tồn kho ban đầu" value={stock} onChange={setStock} />}
        <NumberField label="Mức tồn tối thiểu" value={min} onChange={setMin} hint="Cảnh báo khi tồn ≤ mức này" />
      </div>
    </Modal>
  )
}

/* ============================================================
   Kho hàng
   ============================================================ */
export function Inventory() {
  const { state, user } = useStore()
  const [tab, setTab] = useState<'stock' | 'in' | 'adjust' | 'supplier'>('stock')
  const [q, setQ] = useState('')
  const [modal, setModal] = useState<null | 'in' | 'adjust'>(null)
  const low = state.products.filter((p) => p.stock <= p.min)
  const isMgr = roleRank[user.role] >= 1
  const name = (pid: string) => state.products.find((p) => p.id === pid)?.name ?? pid

  const stockCols: Col<Product>[] = [
    { head: 'Mã SP', cell: (p) => p.id, className: 'code' },
    { head: 'Sản phẩm', cell: (p) => p.name, className: 'strong' },
    { head: 'Tồn hệ thống', cell: (p) => <span className="num" style={{ fontWeight: 600, color: p.stock <= p.min ? 'var(--amber)' : undefined }}>{p.stock}</span>, right: true },
    { head: 'Tồn tối thiểu', cell: (p) => <span className="num">{p.min}</span>, right: true },
    { head: 'Đã bán hôm nay', cell: (p) => <span className="num">{p.sold}</span>, right: true },
    { head: 'Trạng thái', cell: (p) => stockBadge(p) },
  ]
  const moveCols = (type: 'in' | 'adjust'): Col<StockMove>[] => [
    { head: 'Mã phiếu', cell: (m) => m.id, className: 'code' },
    { head: 'Sản phẩm', cell: (m) => name(m.pid), className: 'strong' },
    { head: 'Số lượng', cell: (m) => <span className="num" style={{ color: m.qty < 0 ? 'var(--danger)' : 'var(--green)', fontWeight: 600 }}>{m.qty > 0 ? '+' : ''}{m.qty}</span>, right: true },
    { head: type === 'in' ? 'Nhà cung cấp' : 'Lý do', cell: (m) => m.note },
    { head: 'Người thực hiện', cell: (m) => m.by },
    { head: 'Thời điểm', cell: (m) => stamp(m.time) },
  ]
  const supCols: Col<Supplier>[] = [
    { head: 'Mã', cell: (s) => s.id, className: 'code' },
    { head: 'Nhà cung cấp', cell: (s) => s.name, className: 'strong' },
    { head: 'Liên hệ', cell: (s) => s.phone },
    { head: 'Mặt hàng', cell: (s) => s.items },
    { head: 'Trạng thái', cell: (s) => s.active ? <Badge tone="empty">Hoạt động</Badge> : <Badge tone="muted">Ngừng</Badge> },
  ]

  return (
    <>
      <PageHead eyebrow="Quản lý kho" title="Kho hàng" actions={<div className="button-row"><Button tone="secondary" disabled={!isMgr} onClick={() => setModal('adjust')}>Kiểm kê / điều chỉnh</Button><Button icon="plus" disabled={!isMgr} onClick={() => setModal('in')}>Nhập kho</Button></div>} />
      <div className="stats-row">
        <Stat label="Tổng mặt hàng" value={state.products.length} meta={`${state.products.filter((p) => p.active).length} đang kinh doanh`} icon="box" />
        <Stat label="Sắp hết hàng" value={low.length} pad2 meta="Dưới mức tồn tối thiểu" icon="alert" tone="amber" />
        <Stat label="Nhà cung cấp" value={state.suppliers.length} pad2 meta={`${state.suppliers.filter((s) => s.active).length} đang hoạt động`} icon="warehouse" tone="magenta" />
      </div>
      <div className="card card-flush">
        <div className="toolbar">
          <Tabs value={tab} onChange={setTab} items={[{ value: 'stock', label: 'Tồn kho' }, { value: 'in', label: 'Nhập kho' }, { value: 'adjust', label: 'Điều chỉnh' }, { value: 'supplier', label: 'Nhà cung cấp' }]} />
          {tab === 'stock' && <SearchBox value={q} onChange={setQ} placeholder="Tìm mặt hàng…" />}
        </div>
        {tab === 'stock' && <DataTable key={q} cols={stockCols} rows={state.products.filter((p) => !q || norm(p.name).includes(norm(q))).sort((a, b) => (a.stock - a.min) - (b.stock - b.min))} rowKey={(p) => p.id} />}
        {tab === 'in' && <DataTable cols={moveCols('in')} rows={state.stockMoves.filter((m) => m.type === 'in')} rowKey={(m) => m.id} />}
        {tab === 'adjust' && <DataTable cols={moveCols('adjust')} rows={state.stockMoves.filter((m) => m.type === 'adjust')} rowKey={(m) => m.id} />}
        {tab === 'supplier' && <DataTable cols={supCols} rows={state.suppliers} rowKey={(s) => s.id} />}
      </div>
      <div className="note-line"><Icon name="shield" size={15} /> Mọi điều chỉnh tồn kho bắt buộc nhập lý do và được ghi vào nhật ký thao tác.</div>
      {modal && <StockModal mode={modal} onClose={() => setModal(null)} />}
    </>
  )
}

function StockModal({ mode, onClose }: { mode: 'in' | 'adjust'; onClose: () => void }) {
  const { state, act } = useStore()
  const toast = useToast()
  const [pid, setPid] = useState(state.products.find((p) => p.stock <= p.min)?.id ?? state.products[0].id)
  const [qty, setQty] = useState<number | null>(mode === 'in' ? 24 : null)
  const [sign, setSign] = useState<'-' | '+'>('-')
  const [sup, setSup] = useState(state.suppliers.find((s) => s.active)!.name)
  const [reason, setReason] = useState('')
  const p = state.products.find((x) => x.id === pid)!
  const delta = (qty ?? 0) * (mode === 'in' ? 1 : sign === '-' ? -1 : 1)
  const submit = (close: () => void) => {
    const r = mode === 'in' ? act.restock({ pid, qty: qty ?? 0, supplier: sup }) : act.adjustStock({ pid, delta, reason })
    toast(r)
    if (r.ok) close()
  }
  return (
    <Modal size="sm" eyebrow={mode === 'in' ? 'Nhập kho' : 'Kiểm kê / điều chỉnh'} title={mode === 'in' ? 'Phiếu nhập hàng' : 'Điều chỉnh tồn kho'} onClose={onClose}
      footer={(close) => <><Button tone="ghost" onClick={close}>Hủy</Button><Button onClick={() => submit(close)}>Lưu phiếu</Button></>}>
      <div className="form-stack">
        <SelectField label="Sản phẩm" value={pid} onChange={setPid} options={state.products.map((x) => ({ value: x.id, label: `${x.name} (tồn ${x.stock})` }))} />
        {mode === 'adjust' && <SelectField label="Hướng điều chỉnh" value={sign} onChange={(v) => setSign(v as '-' | '+')} options={[{ value: '-', label: 'Giảm (hỏng, mất, kiểm kê thiếu)' }, { value: '+', label: 'Tăng (kiểm kê thừa)' }]} />}
        <NumberField label="Số lượng" value={qty} onChange={setQty} autoFocus />
        {mode === 'in' ? <SelectField label="Nhà cung cấp" value={sup} onChange={setSup} options={state.suppliers.filter((s) => s.active).map((s) => ({ value: s.name, label: s.name }))} /> : <TextField label="Lý do (bắt buộc)" value={reason} onChange={setReason} placeholder="VD: Hàng hỏng, hết hạn…" />}
        <div className="change" style={{ margin: 0 }}><span>TỒN SAU KHI LƯU</span><strong className={`num ${p.stock + delta < 0 ? 'short' : ''}`}>{num(p.stock + delta)}</strong></div>
      </div>
    </Modal>
  )
}
