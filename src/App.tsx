import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ThemeProvider, useTheme } from './components/theme'
import { AccessDenied, Button, Icon, LightningTrail, Loader, Logo, Modal, TextField, ToastProvider, useGlobalEffects, usePopover, useToast } from './components/ui'
import { ACCOUNTS } from './lib/data'
import { dmy, hms, norm } from './lib/format'
import { NAV, canSee, useRoute, type PageId } from './lib/nav'
import { fetchState } from './lib/remote'
import { setBackend } from './lib/remote'
import { StoreProvider, loadLocalState, mergeState, useNow, useStore, type Boot } from './lib/store'
import { roleRank, type Role, type User } from './lib/types'
import Hub from './pages/Hub'
import Machines from './pages/Machines'
import { Invoices, Members, Orders, Sessions } from './pages/Operations'
import Shifts from './pages/Shifts'
import { Inventory, Products } from './pages/Catalog'
import Maintenance from './pages/Maintenance'
import StaffPage from './pages/Staff'
import { Dashboard, Reports } from './pages/Insights'
import { Audit, BackupPage, Settings } from './pages/System'

/* ============================================================
   Đăng nhập
   ============================================================ */
function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [username, setUsername] = useState('thungan')
  const [password, setPassword] = useState('Thungan@123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(0)
  const { theme, toggle } = useTheme()

  const submit = () => {
    setError('')
    setLoading(true)
    window.setTimeout(() => {
      const acc = ACCOUNTS.find((a) => a.username === username.trim().toLowerCase() && a.password === password)
      if (!acc) { setLoading(false); setError('Sai tên đăng nhập hoặc mật khẩu.'); setShake((s) => s + 1); return }
      const { password: _pw, ...user } = acc
      onLogin(user)
    }, 650)
  }

  return (
    <div className="login-page">
      <div className="login-orbit orbit-one" /><div className="login-orbit orbit-two" />
      <div className="login-top">
        <div className="login-brand"><Logo lg /><div><div className="brand-name">ALT<span>F4</span></div><small className="brand-sub">GAMING CENTER</small></div></div>
        <button className="icon-btn theme-toggle" aria-label="Đổi giao diện sáng/tối" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); toggle({ x: r.left + r.width / 2, y: r.top + r.height / 2 }) }}>
          <span className="sun"><Icon name="sun" /></span><span className="moon"><Icon name="moon" /></span>
        </button>
      </div>

      <div className="login-showcase">
        <div className="showcase-kicker"><span className="pulse" />OPERATIONS / LIVE</div>
        <div className="showcase-title">Kiểm soát toàn bộ<br /><span>gaming center.</span></div>
        <p className="showcase-copy">Theo dõi máy, phiên chơi, kho hàng và doanh thu trong một không gian vận hành tập trung — nhanh, rõ ràng và an toàn.</p>
        <div className="keycaps" aria-hidden="true"><kbd>Alt</kbd><i>+</i><kbd>F4</kbd></div>
        <div className="showcase-metrics">
          <div><strong>12</strong><span>WORKSTATIONS</span></div>
          <div><strong>99.9%</strong><span>SYSTEM UPTIME</span></div>
          <div><strong>03</strong><span>ACTIVE STAFF</span></div>
        </div>
        <div className="showcase-visual"><div className="core-ring"><Icon name="monitor" size={34} /></div></div>
      </div>

      <form key={shake} className={`login-panel hud ${shake ? 'shake' : ''}`} onSubmit={(e) => { e.preventDefault(); submit() }}>
        <div className="login-index">ACCESS NODE // 01</div>
        <div className="login-kicker"><i />ĐĂNG NHẬP HỆ THỐNG</div>
        <h1 className="login-title">Chào mừng trở lại.</h1>
        <p className="login-sub">Nhập thông tin tài khoản nhân viên để tiếp tục vận hành.</p>
        <div className="form-stack">
          <TextField label="Tên đăng nhập" icon="user" value={username} onChange={setUsername} autoComplete="username" />
          <TextField label="Mật khẩu" icon="lock" type="password" value={password} onChange={setPassword} autoComplete="current-password" error={error} />
          <Button type="submit" block loading={loading}>Đăng nhập <Icon name="arrow" size={16} /></Button>
        </div>
        <div className="demo-accounts">
          <p><Icon name="shield" size={14} /> Tài khoản dùng thử — bấm để điền nhanh</p>
          <div>{ACCOUNTS.map((a) => <button type="button" key={a.username} className="chip" onClick={() => { setUsername(a.username); setPassword(a.password); setError('') }}>{a.role}</button>)}</div>
        </div>
      </form>
      <div className="login-footer"><span>ALTF4 GAMING CENTER v2.5.0</span><span>{dmy(Date.now())} · ICT</span></div>
    </div>
  )
}

/* ============================================================
   Command palette (Ctrl/⌘ + K)
   ============================================================ */
function Palette({ onClose, go, onLogout }: { onClose: () => void; go: (p: PageId) => void; onLogout: () => void }) {
  const { user } = useStore()
  const { theme, setTheme } = useTheme()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const [closing, setClosing] = useState(false)
  const items = useMemo(() => {
    const pages = NAV.filter((n) => canSee(user.role, n.id)).map((n) => ({ key: n.id, icon: n.icon, label: n.label, hint: n.hint, tag: 'TRANG', run: () => go(n.id) }))
    const acts = [
      { key: 'theme', icon: theme === 'dark' ? 'sun' : 'moon', label: theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối', hint: 'Đổi chế độ hiển thị', tag: 'HÀNH ĐỘNG', run: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
      { key: 'logout', icon: 'logout', label: 'Đăng xuất', hint: 'Kết thúc phiên làm việc', tag: 'HÀNH ĐỘNG', run: onLogout },
    ]
    const k = norm(q)
    return [...pages, ...acts].filter((i) => !k || norm(`${i.label} ${i.hint}`).includes(k))
  }, [q, user.role, theme, go, setTheme, onLogout])
  const close = useCallback(() => { setClosing(true); window.setTimeout(onClose, 180) }, [onClose])
  useEffect(() => setSel(0), [q])
  const choose = (i: number) => { const it = items[i]; if (!it) return; close(); window.setTimeout(it.run, 120) }
  return (
    <div className={`modal-backdrop palette-backdrop ${closing ? 'closing' : ''}`} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="palette hud" role="dialog" aria-label="Tìm nhanh">
        <div className="palette-input"><Icon name="search" /><input autoFocus placeholder="Tìm trang hoặc hành động…" value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(items.length - 1, s + 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)) }
            else if (e.key === 'Enter') choose(sel)
            else if (e.key === 'Escape') close()
          }} /></div>
        <div className="palette-list">
          {items.map((it, i) => <button key={it.key} className={`palette-item ${i === sel ? 'sel' : ''}`} onMouseEnter={() => setSel(i)} onClick={() => choose(i)}><Icon name={it.icon} /><span>{it.label}</span><small>{it.tag}</small></button>)}
          {!items.length && <div className="empty-state" style={{ minHeight: 120 }}><strong>Không tìm thấy kết quả</strong></div>}
        </div>
        <div className="palette-foot"><span><kbd>↑↓</kbd>Di chuyển</span><span><kbd>Enter</kbd>Chọn</span><span><kbd>Esc</kbd>Đóng</span></div>
      </div>
    </div>
  )
}

/* ============================================================
   Đổi mật khẩu
   ============================================================ */
function PasswordModal({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const [old, setOld] = useState('')
  const [nw, setNw] = useState('')
  const [cf, setCf] = useState('')
  const [err, setErr] = useState<Record<string, string>>({})
  const submit = (close: () => void) => {
    const e: Record<string, string> = {}
    if (!old) e.old = 'Nhập mật khẩu hiện tại.'
    if (nw.length < 8 || !/[A-Za-z]/.test(nw) || !/\d/.test(nw)) e.nw = 'Tối thiểu 8 ký tự, gồm chữ và số.'
    if (cf !== nw) e.cf = 'Mật khẩu xác nhận không khớp.'
    setErr(e)
    if (Object.keys(e).length) return
    toast.show('success', 'Thao tác thành công', 'Mật khẩu cá nhân đã được cập nhật.')
    close()
  }
  return (
    <Modal size="sm" eyebrow="Bảo mật cá nhân" title="Đổi mật khẩu" onClose={onClose}
      footer={(close) => <><Button tone="ghost" onClick={close}>Hủy</Button><Button onClick={() => submit(close)}>Cập nhật</Button></>}>
      <div className="form-stack">
        <TextField label="Mật khẩu cũ" type="password" icon="lock" value={old} onChange={setOld} error={err.old} autoFocus />
        <TextField label="Mật khẩu mới" type="password" icon="key" value={nw} onChange={setNw} error={err.nw} placeholder="Tối thiểu 8 ký tự" />
        <TextField label="Xác nhận mật khẩu" type="password" icon="key" value={cf} onChange={setCf} error={err.cf} placeholder="Nhập lại mật khẩu mới" />
      </div>
    </Modal>
  )
}

function Clock() {
  const now = useNow()
  return <div className="clock-chip"><Icon name="clock" size={15} />{hms(now)} · {dmy(now)}</div>
}

/* ============================================================
   Shell: sidebar + topbar + trang (có hiệu ứng chuyển trang)
   ============================================================ */
function Shell({ account, role, setRole, onLogout, firstEnter }: { account: User; role: Role; setRole: (r: Role) => void; onLogout: () => void; firstEnter: boolean }) {
  const { state, user, saveError, notice } = useStore()
  const toastBar = useToast()
  const { theme, toggle } = useTheme()
  const [route, go] = useRoute()
  const [view, setView] = useState<PageId>(route)
  const [leaving, setLeaving] = useState(false)
  const [drawer, setDrawer] = useState(false)
  useEffect(() => { if (saveError) toastBar({ ok: false, msg: 'Không lưu được dữ liệu. Nếu dùng XAMPP: kiểm tra Apache đang chạy và thư mục data có quyền ghi.' }) }, [saveError, toastBar])
  useEffect(() => { if (notice.n) toastBar({ ok: true, msg: notice.text }) }, [notice, toastBar])
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { const v = localStorage.getItem('altf4-side'); if (v) return v === '1' } catch { /* bỏ qua */ }
    return window.innerWidth < 1180
  })
  const [tip, setTip] = useState<{ label: string; y: number } | null>(null)
  const toggleSide = useCallback(() => setCollapsed((c) => { try { localStorage.setItem('altf4-side', c ? '0' : '1') } catch { /* bỏ qua */ } return !c }), [])
  const [palette, setPalette] = useState(false)
  const [pw, setPw] = useState(false)
  const profile = usePopover()
  const bell = usePopover()
  const mainRef = useRef<HTMLElement>(null)

  // Chuyển trang: trang cũ mờ đi → trang mới trượt vào lần lượt từng khối
  useEffect(() => {
    if (route === view) return
    setLeaving(true)
    const t = window.setTimeout(() => { setView(route); setLeaving(false); window.scrollTo({ top: 0 }) }, 170)
    return () => window.clearTimeout(t)
  }, [route, view])
  useEffect(() => setDrawer(false), [route])

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p) }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); toggleSide() }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [toggleSide])

  const visible = NAV.filter((n) => roleRank[role] >= roleRank[n.min])
  const groups = Array.from(new Set(visible.map((n) => n.group)))
  const current = NAV.find((n) => n.id === view)!
  const newOrders = state.orders.filter((o) => o.status === 'Mới').length
  const openTickets = state.tickets.filter((t) => t.status === 'open').length
  const lowStock = state.products.filter((p) => p.stock <= p.min).length
  const lowMem = state.members.filter((m) => !m.locked && m.balance < state.settings.lowBalance).length
  const badge = (id: PageId): { n: number; amber?: boolean } | null =>
    id === 'orders' && newOrders ? { n: newOrders } : id === 'maintenance' && openTickets ? { n: openTickets, amber: true } : id === 'inventory' && lowStock ? { n: lowStock, amber: true } : id === 'members' && lowMem ? { n: lowMem, amber: true } : null
  const notifs = [
    newOrders && { tone: 'magenta', icon: 'cart', t: `${newOrders} đơn đang chờ phục vụ`, d: 'Mở mục Đơn hàng để xử lý', to: 'orders' as PageId },
    lowStock && roleRank[role] >= 1 && { tone: 'amber', icon: 'box', t: `${lowStock} sản phẩm sắp hết`, d: 'Dưới mức tồn tối thiểu', to: 'inventory' as PageId },
    lowMem && { tone: 'magenta', icon: 'users', t: `${lowMem} hội viên số dư thấp`, d: 'Nhắc khách nạp thêm', to: 'members' as PageId },
    openTickets && { tone: 'cyan', icon: 'wrench', t: `${openTickets} phiếu bảo trì đang mở`, d: 'Máy chờ sửa chữa', to: 'maintenance' as PageId },
  ].filter(Boolean) as { tone: string; icon: string; t: string; d: string; to: PageId }[]

  const switchRole = (r: Role) => {
    setRole(r)
    profile.setOpen(false)
    if (roleRank[r] < roleRank[NAV.find((n) => n.id === route)!.min]) go('hub')
  }

  const page = (() => {
    if (!canSee(role, view)) return <AccessDenied />
    switch (view) {
      case 'hub': return <Hub go={go} />
      case 'machines': return <Machines go={go} />
      case 'sessions': return <Sessions />
      case 'orders': return <Orders />
      case 'members': return <Members />
      case 'invoices': return <Invoices />
      case 'shifts': return <Shifts />
      case 'maintenance': return <Maintenance go={go} />
      case 'products': return <Products />
      case 'inventory': return <Inventory />
      case 'staff': return <StaffPage />
      case 'dashboard': return <Dashboard go={go} />
      case 'reports': return <Reports />
      case 'settings': return <Settings />
      case 'audit': return <Audit />
      case 'backup': return <BackupPage />
    }
  })()

  let navIndex = 0
  return (
    <div className={`app-shell ${firstEnter ? 'app-enter' : ''} ${collapsed ? 'collapsed' : ''}`}>
      {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}
      <aside className={`sidebar ${drawer ? 'open' : ''}`}>
        <div className="sidebar-brand"><Logo /><div className="brand-text"><div className="brand-name">ALT<span>F4</span></div><small className="brand-sub">GAMING CENTER</small></div></div>
        <div className="venue"><small>CHI NHÁNH ĐANG HOẠT ĐỘNG</small><strong>{state.settings.venue.toUpperCase()}</strong><span>{state.settings.address.split(',').slice(0, 2).join(',')}</span></div>
        <button className="edge-toggle" onClick={toggleSide} aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'} title={collapsed ? 'Mở rộng (Ctrl+B)' : 'Thu gọn (Ctrl+B)'}><Icon name="arrow" size={14} /></button>
        <nav className="nav" aria-label="Điều hướng chính" onScroll={() => setTip(null)}>
          {groups.map((g) => (
            <div key={g}>
              <span className="nav-group">{g}</span>
              {visible.filter((n) => n.group === g).map((n) => {
                const b = badge(n.id)
                return (
                  <button key={n.id} onMouseEnter={(e) => { if (collapsed) setTip({ label: n.label, y: e.currentTarget.getBoundingClientRect().top + 20 }) }} onMouseLeave={() => setTip(null)} onFocus={(e) => { if (collapsed) setTip({ label: n.label, y: e.currentTarget.getBoundingClientRect().top + 20 }) }} onBlur={() => setTip(null)} style={{ ['--i' as string]: navIndex++ }} className={`nav-item ${view === n.id ? 'active' : ''}`} aria-current={view === n.id ? 'page' : undefined} onClick={() => { setTip(null); go(n.id) }}>
                    <Icon name={n.icon} /><span>{n.label}</span>{b && <span className={`nav-count ${b.amber ? 'amber' : ''}`}>{b.n}</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot"><span className="live-dot" /><div><strong>Hệ thống ổn định</strong><span className="ping"><b><i /><i /><i /></b>12 ms · đồng bộ trực tiếp</span></div></div>
      </aside>

      {collapsed && tip && <div className="rail-tip" style={{ top: tip.y }}>{tip.label}</div>}
      <main className="main" ref={mainRef}>
        <header className="topbar">
          <button className="icon-btn menu-btn" aria-label="Mở menu" onClick={() => setDrawer(true)}><Icon name="menu" /></button>
          <button className="icon-btn side-toggle" aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'} title="Đóng/mở thanh bên (Ctrl+B)" aria-pressed={!collapsed} onClick={toggleSide}><Icon name="panel" /></button>
          <div className="breadcrumb"><span>{current.group}</span><Icon name="arrow" size={13} /><strong>{current.label.toUpperCase()}</strong></div>
          <div className="top-spacer" />
          <div className="top-actions">
            <button className="cmd-btn" onClick={() => setPalette(true)} aria-label="Tìm nhanh"><Icon name="search" size={16} /><span>Tìm nhanh…</span><kbd>Ctrl K</kbd></button>
            <Clock />
            <button className="icon-btn theme-toggle" aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'} title="Đổi giao diện sáng/tối" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); toggle({ x: r.left + r.width / 2, y: r.top + r.height / 2 }) }}>
              <span className="sun"><Icon name="sun" /></span><span className="moon"><Icon name="moon" /></span>
            </button>
            <div className="menu-anchor" ref={bell.ref}>
              <button className="icon-btn" aria-label="Thông báo" aria-expanded={bell.open} onClick={() => { bell.setOpen(!bell.open); profile.setOpen(false) }}>
                <Icon name="bell" />{notifs.length > 0 && <span className="dot-count">{notifs.length}</span>}
              </button>
              {bell.open && (
                <div className="menu" style={{ minWidth: 320 }}>
                  <div className="menu-head"><strong>Thông báo</strong><span>{notifs.length ? `${notifs.length} mục cần chú ý` : 'Không có thông báo mới'}</span></div>
                  {notifs.map((n) => <button key={n.t} className={`notif ${n.tone}`} onClick={() => { bell.setOpen(false); go(n.to) }}><Icon name={n.icon} /><div><strong>{n.t}</strong><span>{n.d}</span></div></button>)}
                </div>
              )}
            </div>
            <div className="menu-anchor" ref={profile.ref}>
              <button className="profile-btn" aria-expanded={profile.open} onClick={() => { profile.setOpen(!profile.open); bell.setOpen(false) }}>
                <div className="avatar">{account.initials}</div>
                <div><strong>{account.name}</strong><span>{role}{state.shift.status === 'open' ? ' · Ca đang mở' : ''}</span></div>
                <Icon name="arrow" size={14} />
              </button>
              {profile.open && (
                <div className="menu">
                  <div className="menu-head"><strong>{account.name}</strong><span>{account.username} · {role}</span></div>
                  <button className="menu-item" onClick={() => { profile.setOpen(false); setPw(true) }}><Icon name="key" size={17} />Đổi mật khẩu</button>
                  <div className="menu-sep" />
                  <div className="menu-label">XEM GIAO DIỆN THEO VAI TRÒ (DEMO)</div>
                  {(['Thu ngân', 'Quản lý', 'Quản trị viên'] as Role[]).map((r) => <button key={r} className={`menu-item ${role === r ? 'active' : ''}`} onClick={() => switchRole(r)}><Icon name={role === r ? 'check' : 'user'} size={17} />{r}</button>)}
                  <div className="menu-sep" />
                  <button className="menu-item danger" onClick={onLogout}><Icon name="logout" size={17} />Đăng xuất</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="page">
          <div key={view} className={`page-enter ${leaving ? 'page-exit' : ''}`}>{page}</div>
        </div>
      </main>

      {palette && <Palette onClose={() => setPalette(false)} go={go} onLogout={onLogout} />}
      {pw && <PasswordModal onClose={() => setPw(false)} />}
      <span hidden>{user.role}</span>
    </div>
  )
}

/* ============================================================
   Root
   ============================================================ */
const AUTH_KEY = 'altf4-auth'
function restoreAuth(): { account: User | null; role: Role } {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (raw) {
      const { username, role } = JSON.parse(raw) as { username: string; role: Role }
      const acc = ACCOUNTS.find((a) => a.username === username)
      if (acc) return { account: acc, role: role in roleRank ? role : acc.role }
    }
  } catch { /* bỏ qua */ }
  return { account: null, role: 'Thu ngân' }
}

function Root() {
  useGlobalEffects()
  const init = useRef(restoreAuth()).current
  const [account, setAccount] = useState<User | null>(init.account)
  const [role, setRoleState] = useState<Role>(init.role)
  const [boot, setBoot] = useState(false)
  const setRole = useCallback((r: Role) => {
    setRoleState(r)
    try { const raw = localStorage.getItem(AUTH_KEY); if (raw) localStorage.setItem(AUTH_KEY, JSON.stringify({ ...JSON.parse(raw), role: r })) } catch { /* bỏ qua */ }
  }, [])

  const login = (u: User) => {
    setAccount(u); setRoleState(u.role); setBoot(true)
    try { localStorage.setItem(AUTH_KEY, JSON.stringify({ username: u.username, role: u.role })) } catch { /* bỏ qua */ }
    window.location.hash = '/hub'
    window.setTimeout(() => setBoot(false), 1700)
  }
  const logout = useCallback(() => { setAccount(null); setBoot(false); try { localStorage.removeItem(AUTH_KEY) } catch { /* bỏ qua */ } }, [])

  const [first, setFirst] = useState(true)
  const [data, setData] = useState<Boot | null>(null)
  useEffect(() => {
    let alive = true
    ;(async () => {
      const d = await fetchState()
      if (!alive) return
      if (d) { setBackend(true); setData({ mode: 'php', state: d.state ? mergeState(d.state) : loadLocalState(), rev: d.rev }) }
      else { setBackend(false); setData({ mode: 'local', state: loadLocalState(), rev: 0 }) }
    })()
    return () => { alive = false }
  }, [])
  useEffect(() => { const t = window.setTimeout(() => setFirst(false), 1500); return () => window.clearTimeout(t) }, [])
  if (!data || (first && !account)) return <Loader caption={data ? 'ĐANG KHỞI ĐỘNG HỆ THỐNG…' : 'ĐANG KẾT NỐI DỮ LIỆU…'} out={!!data} />
  if (!account) return <Login onLogin={login} />
  const user: User = { ...account, role }
  return (
    <StoreProvider user={user} boot={data}>
      <Shell account={account} role={role} setRole={setRole} onLogout={logout} firstEnter={boot} />
      {boot && <Loader out />}
    </StoreProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <LightningTrail />
        <Root />
      </ToastProvider>
    </ThemeProvider>
  )
}
