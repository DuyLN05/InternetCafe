import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from './ui'
import { hm } from '../lib/format'
import { useStore } from '../lib/store'

type Message = { id: string; text: string; from: 'admin' | 'client'; time: number }
type Chats = Record<string, Message[]>
const KEY = 'altf4-admin-chats'

function readChats(): Chats {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') as Chats } catch { return {} }
}

export default function ChatWidget() {
  const { state } = useStore()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState('')
  const [chats, setChats] = useState<Chats>(readChats)
  const [draft, setDraft] = useState('')
  const messagesRef = useRef<HTMLDivElement>(null)
  const activeMachines = useMemo(() => state.sessions.filter((s) => s.status === 'open').map((s) => ({ id: s.machineId, customer: s.customer })), [state.sessions])
  const selectedMachine = activeMachines.find((m) => m.id === selected) ?? activeMachines[0]
  const messages = selectedMachine ? chats[selectedMachine.id] ?? [] : []
  const unread = Object.values(chats).reduce((n, list) => n + list.filter((m) => m.from === 'client').length, 0)

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(chats)) } catch { /* bỏ qua */ } }, [chats])
  useEffect(() => { if (!selectedMachine && activeMachines[0]) setSelected(activeMachines[0].id) }, [activeMachines, selectedMachine])
  useEffect(() => { if (open && messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight }, [open, messages.length, selectedMachine?.id])

  const send = () => {
    const text = draft.trim()
    if (!text || !selectedMachine) return
    setChats((prev) => ({ ...prev, [selectedMachine.id]: [...(prev[selectedMachine.id] ?? []), { id: `${Date.now()}-${Math.random()}`, text, from: 'admin', time: Date.now() }] }))
    setDraft('')
  }

  return <div className="chat-widget">
    {open && <section className="chat-panel hud" aria-label="Chat với máy khách">
      <header className="chat-head"><div><span className="eyebrow cyan">HỖ TRỢ TRỰC TIẾP</span><strong>Trò chuyện khách hàng</strong></div><button className="icon-btn" onClick={() => setOpen(false)} aria-label="Đóng chat"><Icon name="x" size={17} /></button></header>
      <div className="chat-layout">
        <aside className="chat-machines"><div className="chat-section-label">MÁY ĐANG HOẠT ĐỘNG <span>{activeMachines.length}</span></div>
          {activeMachines.map((m) => <button key={m.id} className={`chat-machine ${selectedMachine?.id === m.id ? 'active' : ''}`} onClick={() => setSelected(m.id)}><span className="chat-avatar"><Icon name="monitor" size={16} /></span><span><strong>{m.id}</strong><small>{m.customer}</small></span></button>)}
          {!activeMachines.length && <div className="chat-empty-list">Chưa có máy khách nào mở phiên.</div>}
        </aside>
        <div className="chat-conversation">
          {selectedMachine ? <>
            <div className="chat-contact"><span className="live-dot" /><div><strong>{selectedMachine.id} · {selectedMachine.customer}</strong><small>Đang trong phiên chơi</small></div></div>
            <div className="chat-messages" ref={messagesRef}>
              {!messages.length && <div className="chat-welcome"><span className="chat-welcome-icon"><Icon name="users" size={22} /></span><strong>Bắt đầu cuộc trò chuyện</strong><span>Gửi lời chào hoặc hỗ trợ khách tại {selectedMachine.id}.</span></div>}
              {messages.map((m) => <div key={m.id} className={`chat-message ${m.from}`}><div>{m.text}</div><small>{m.from === 'admin' ? 'Quản trị viên' : 'Khách'} · {hm(m.time)}</small></div>)}
            </div>
            <form className="chat-compose" onSubmit={(e) => { e.preventDefault(); send() }}><input aria-label="Tin nhắn" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Nhập tin nhắn…" /><button className="chat-send" type="submit" disabled={!draft.trim()} aria-label="Gửi tin nhắn"><Icon name="arrow" size={17} /></button></form>
          </> : <div className="chat-no-session"><span><Icon name="users" size={24} /></span><strong>Chưa có máy khách trực tuyến</strong><small>Cuộc trò chuyện sẽ xuất hiện khi có phiên máy đang mở.</small></div>}
        </div>
      </div>
      <footer className="chat-foot"><Icon name="shield" size={13} /> Chat demo · tin nhắn được lưu trên trình duyệt này</footer>
    </section>}
    <button className={`chat-launcher ${open ? 'is-open' : ''}`} onClick={() => setOpen((v) => !v)} aria-label={open ? 'Đóng cửa sổ chat' : 'Mở cửa sổ chat'} aria-expanded={open}><Icon name={open ? 'x' : 'users'} size={21} />{!open && unread > 0 && <span className="chat-unread">{unread}</span>}<span>{open ? 'Đóng chat' : 'Chat khách hàng'}</span></button>
  </div>
}
