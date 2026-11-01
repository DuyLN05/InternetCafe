export type Role = 'Thu ngân' | 'Quản lý' | 'Quản trị viên'
export const roleRank: Record<Role, number> = { 'Thu ngân': 0, 'Quản lý': 1, 'Quản trị viên': 2 }

export type MachineState = 'empty' | 'using' | 'maintenance'
export type PayMethod = 'cash' | 'wallet' | 'transfer'

export interface Machine {
  id: string
  zone: 'VIP' | 'Thường'
  rate: number
  state: MachineState
}

export interface Session {
  id: string
  machineId: string
  memberId?: string
  customer: string
  start: number
  end?: number
  rate: number
  status: 'open' | 'closed'
  openedBy: string
  fee?: number
  minutes?: number
  invoiceId?: string
}

export interface Member {
  id: string
  name: string
  phone: string
  balance: number
  last: number
  locked: boolean
}

export interface Product {
  id: string
  name: string
  /** Ảnh sản phẩm (data URL đã nén). Trống → dùng tranh minh họa mặc định */
  image?: string
  cat: 'Nước giải khát' | 'Đồ ăn' | 'Thẻ & phụ kiện'
  price: number
  stock: number
  min: number
  sold: number
  active: boolean
}

export interface OrderLine { pid: string; name: string; qty: number; price: number }
export type OrderStatus = 'Mới' | 'Đã phục vụ' | 'Đã hủy'
export interface Order {
  id: string
  machineId?: string
  sessionId?: string
  customer: string
  lines: OrderLine[]
  total: number
  time: number
  status: OrderStatus
  billed: boolean
}

export interface Invoice {
  id: string
  customer: string
  machineId?: string
  machineFee: number
  fnb: number
  total: number
  method: PayMethod
  status: 'paid' | 'refunded'
  time: number
  shiftId: string
  memberId?: string
  by: string
  refundReason?: string
}

export interface Ticket {
  id: string
  machineId: string
  issue: string
  assignee: string
  time: number
  status: 'open' | 'closed'
  result?: string
}

export interface Staff {
  id: string
  name: string
  username: string
  role: Role
  active: boolean
}

export interface LogEntry { id: number; time: number; user: string; role: Role; action: string; target: string; detail: string }
export interface WalletTx { id: string; memberId: string; amount: number; method: PayMethod; time: number; shiftId: string }
export interface StockMove { id: string; pid: string; type: 'in' | 'adjust'; qty: number; note: string; time: number; by: string }
export interface Supplier { id: string; name: string; phone: string; items: string; active: boolean }
export interface Shift { id: string; user: string; openAt: number; openCash: number; status: 'open' | 'closed'; closeAt?: number; expected?: number; counted?: number }
export interface Backup { id: string; name: string; time: number; by: string; size: string; kind: 'Tự động' | 'Thủ công' }

export interface Settings {
  venue: string; phone: string; address: string
  minMinutes: number; roundMoney: number; lowBalance: number
  rateVip: number; rateStd: number
}

export interface DayStat { d: string; machine: number; fnb: number }

export interface Game {
  id: string
  name: string
  genre: string
  desc: string
  /** Cài trên khu máy nào */
  zone: 'Tất cả máy' | 'Khu VIP' | 'Khu thường'
  /** Bảng màu sóng của thẻ */
  tone: 'violet' | 'cyan' | 'magenta' | 'green' | 'amber'
  image?: string
}

export interface Banner {
  id: string
  tag: string
  title: string
  subtitle: string
  cta: string
  tone: Game['tone']
  image?: string
  /** Game liên kết: bấm nút sẽ cuộn tới thẻ game này */
  gameId?: string
}

export interface State {
  banners: Banner[]
  games: Game[]
  machines: Machine[]
  sessions: Session[]
  members: Member[]
  products: Product[]
  orders: Order[]
  invoices: Invoice[]
  tickets: Ticket[]
  staff: Staff[]
  logs: LogEntry[]
  walletTx: WalletTx[]
  stockMoves: StockMove[]
  suppliers: Supplier[]
  shift: Shift
  shifts: Shift[]
  backups: Backup[]
  settings: Settings
  history: DayStat[]
  dayStart: number
  seq: number
}

export interface User { name: string; username: string; role: Role; initials: string }
