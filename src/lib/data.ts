import type { State, User, Role } from './types'

export const ACCOUNTS: (User & { password: string })[] = [
  { name: 'Lê Nhật Duy', username: 'thungan', password: 'Thungan@123', role: 'Thu ngân', initials: 'LD' },
  { name: 'Trương Thiện Thư', username: 'quanly', password: 'Quanly@123', role: 'Quản lý', initials: 'TT' },
  { name: 'Lê Chí Toàn', username: 'admin', password: 'Admin@123', role: 'Quản trị viên', initials: 'LT' },
]

const MIN = 60_000
const HOUR = 60 * MIN

export function seed(): State {
  const now = Date.now()
  const shiftId = 'CA-001'
  const ago = (m: number) => now - m * MIN

  const machines = Array.from({ length: 12 }, (_, i) => ({
    id: `PC-${String(i + 1).padStart(2, '0')}`,
    zone: i < 6 ? ('VIP' as const) : ('Thường' as const),
    rate: i < 6 ? 15000 : 10000,
    state: 'empty' as 'empty' | 'using' | 'maintenance',
  }))
  const setState = (id: string, s: 'using' | 'maintenance') => { machines.find((m) => m.id === id)!.state = s }
  ;['PC-01', 'PC-03', 'PC-06', 'PC-09'].forEach((id) => setState(id, 'using'))
  setState('PC-04', 'maintenance')

  const sessions = [
    { id: 'PS-240518', machineId: 'PC-01', memberId: 'HV-00213', customer: 'Nguyễn Minh Khang', start: ago(138), rate: 15000, status: 'open' as const, openedBy: 'Lê Nhật Duy' },
    { id: 'PS-240519', machineId: 'PC-03', customer: 'Khách vãng lai', start: ago(47), rate: 15000, status: 'open' as const, openedBy: 'Lê Nhật Duy' },
    { id: 'PS-240520', machineId: 'PC-06', memberId: 'HV-00214', customer: 'Trần Gia Huy', start: ago(96), rate: 15000, status: 'open' as const, openedBy: 'Lê Nhật Duy' },
    { id: 'PS-240521', machineId: 'PC-09', customer: 'Khách vãng lai', start: ago(22), rate: 10000, status: 'open' as const, openedBy: 'Lê Nhật Duy' },
    { id: 'PS-240517', machineId: 'PC-12', customer: 'Khách vãng lai', start: ago(250), end: ago(155), rate: 10000, status: 'closed' as const, openedBy: 'Lê Nhật Duy', fee: 16000, minutes: 95, invoiceId: 'HD-250518-041' },
    { id: 'PS-240516', machineId: 'PC-06', memberId: 'HV-00214', customer: 'Trần Gia Huy', start: ago(330), end: ago(241), rate: 15000, status: 'closed' as const, openedBy: 'Lê Nhật Duy', fee: 22400, minutes: 89, invoiceId: 'HD-250518-042' },
    { id: 'PS-240515', machineId: 'PC-02', customer: 'Khách vãng lai', start: ago(420), end: ago(360), rate: 15000, status: 'closed' as const, openedBy: 'Lê Nhật Duy', fee: 15000, minutes: 60, invoiceId: 'HD-250518-040' },
  ]

  const products = [
    { id: 'SP-001', name: 'Sting dâu', cat: 'Nước giải khát', price: 15000, stock: 48, min: 12, sold: 18 },
    { id: 'SP-002', name: 'Mì trứng xúc xích', cat: 'Đồ ăn', price: 21000, stock: 12, min: 8, sold: 11 },
    { id: 'SP-003', name: 'Cà phê lon', cat: 'Nước giải khát', price: 17000, stock: 4, min: 10, sold: 9 },
    { id: 'SP-004', name: 'Coca-Cola', cat: 'Nước giải khát', price: 15000, stock: 36, min: 12, sold: 14 },
    { id: 'SP-005', name: 'Trà đào cam sả', cat: 'Nước giải khát', price: 25000, stock: 20, min: 6, sold: 7 },
    { id: 'SP-006', name: 'Cơm chiên trứng', cat: 'Đồ ăn', price: 35000, stock: 15, min: 5, sold: 5 },
    { id: 'SP-007', name: 'Bánh mì thịt', cat: 'Đồ ăn', price: 22000, stock: 18, min: 6, sold: 8 },
    { id: 'SP-008', name: 'Mì ly bò', cat: 'Đồ ăn', price: 18000, stock: 2, min: 8, sold: 6 },
    { id: 'SP-009', name: 'Nước suối Aquafina', cat: 'Nước giải khát', price: 8000, stock: 60, min: 20, sold: 12 },
    { id: 'SP-010', name: 'Khoai tây chiên', cat: 'Đồ ăn', price: 28000, stock: 14, min: 5, sold: 4 },
    { id: 'SP-011', name: 'Tai nghe gaming (cho thuê)', cat: 'Thẻ & phụ kiện', price: 5000, stock: 10, min: 3, sold: 2 },
    { id: 'SP-012', name: 'Thẻ cào Garena 50K', cat: 'Thẻ & phụ kiện', price: 50000, stock: 25, min: 5, sold: 3 },
  ].map((p) => ({ ...p, active: true })) as State['products']

  const members = [
    { id: 'HV-00214', name: 'Trần Gia Huy', phone: '0912 345 678', balance: 245000, last: ago(96), locked: false },
    { id: 'HV-00213', name: 'Nguyễn Minh Khang', phone: '0988 201 145', balance: 18000, last: ago(138), locked: false },
    { id: 'HV-00212', name: 'Lê Hoàng Nam', phone: '0904 721 889', balance: 0, last: now - 7 * 24 * HOUR, locked: true },
    { id: 'HV-00211', name: 'Phạm Bảo Châu', phone: '0933 118 204', balance: 120000, last: now - 24 * HOUR, locked: false },
    { id: 'HV-00210', name: 'Võ Thanh Tùng', phone: '0977 520 931', balance: 12000, last: now - 2 * 24 * HOUR, locked: false },
    { id: 'HV-00209', name: 'Đặng Khánh Linh', phone: '0356 442 710', balance: 385000, last: now - 3 * 24 * HOUR, locked: false },
    { id: 'HV-00208', name: 'Bùi Quang Vinh', phone: '0868 904 227', balance: 64000, last: now - 4 * 24 * HOUR, locked: false },
  ]

  const L = (pid: string, qty: number) => {
    const p = products.find((x) => x.id === pid)!
    return { pid, name: p.name, qty, price: p.price }
  }
  const orders = [
    { id: 'DH-10528', machineId: 'PC-01', sessionId: 'PS-240518', customer: 'Nguyễn Minh Khang', lines: [L('SP-001', 2), L('SP-002', 1)], total: 51000, time: ago(25), status: 'Mới' as const, billed: false },
    { id: 'DH-10527', machineId: 'PC-06', sessionId: 'PS-240520', customer: 'Trần Gia Huy', lines: [L('SP-004', 1)], total: 15000, time: ago(52), status: 'Đã phục vụ' as const, billed: false },
    { id: 'DH-10526', customer: 'Khách vãng lai', lines: [L('SP-003', 2)], total: 34000, time: ago(180), status: 'Đã hủy' as const, billed: false },
    { id: 'DH-10525', machineId: 'PC-12', sessionId: 'PS-240517', customer: 'Khách vãng lai', lines: [L('SP-005', 1), L('SP-010', 1)], total: 53000, time: ago(200), status: 'Đã phục vụ' as const, billed: true },
  ]

  const invoices = [
    { id: 'HD-250518-042', customer: 'Trần Gia Huy', machineId: 'PC-06', machineFee: 22400, fnb: 0, total: 22400, method: 'wallet' as const, status: 'paid' as const, time: ago(241), shiftId, memberId: 'HV-00214', by: 'Lê Nhật Duy' },
    { id: 'HD-250518-041', customer: 'Khách vãng lai', machineId: 'PC-12', machineFee: 16000, fnb: 53000, total: 69000, method: 'cash' as const, status: 'paid' as const, time: ago(155), shiftId, by: 'Lê Nhật Duy' },
    { id: 'HD-250518-040', customer: 'Khách vãng lai', machineId: 'PC-02', machineFee: 15000, fnb: 0, total: 15000, method: 'cash' as const, status: 'paid' as const, time: ago(360), shiftId, by: 'Lê Nhật Duy' },
    { id: 'HD-250518-039', customer: 'Khách vãng lai', machineFee: 0, fnb: 86000, total: 86000, method: 'transfer' as const, status: 'paid' as const, time: ago(300), shiftId, by: 'Lê Nhật Duy' },
    { id: 'HD-250518-038', customer: 'Đặng Khánh Linh', machineFee: 36000, fnb: 15000, total: 51000, method: 'wallet' as const, status: 'paid' as const, time: ago(380), shiftId, memberId: 'HV-00209', by: 'Lê Nhật Duy' },
    { id: 'HD-250517-120', customer: 'Võ Thanh Tùng', machineFee: 30000, fnb: 0, total: 30000, method: 'cash' as const, status: 'refunded' as const, time: now - 20 * HOUR, shiftId: 'CA-000', memberId: 'HV-00210', by: 'Trần Quốc Bảo', refundReason: 'Máy treo giữa phiên' },
  ]

  const tickets = [
    { id: 'BT-0058', machineId: 'PC-04', issue: 'Bàn phím chập phím W', assignee: 'Lê Văn Sơn', time: ago(380), status: 'open' as const },
    { id: 'BT-0057', machineId: 'PC-09', issue: 'Màn hình nhấp nháy', assignee: 'Lê Văn Sơn', time: now - 26 * HOUR, status: 'closed' as const, result: 'Thay cáp HDMI' },
    { id: 'BT-0056', machineId: 'PC-11', issue: 'Chuột double-click', assignee: 'Lê Văn Sơn', time: now - 3 * 24 * HOUR, status: 'closed' as const, result: 'Thay chuột mới' },
  ]

  const staff = [
    { id: 'NV-008', name: 'Lê Nhật Duy', username: 'thungan', role: 'Thu ngân' as Role, active: true },
    { id: 'NV-003', name: 'Trương Thiện Thư', username: 'quanly', role: 'Quản lý' as Role, active: true },
    { id: 'NV-001', name: 'Lê Chí Toàn', username: 'admin', role: 'Quản trị viên' as Role, active: true },
    { id: 'NV-006', name: 'Lê Văn Sơn', username: 'kythuat.son', role: 'Thu ngân' as Role, active: false },
  ]

  const logs = [
    { id: 5, time: ago(22), user: 'Lê Nhật Duy', role: 'Thu ngân' as Role, action: 'Mở phiên', target: 'PS-240521', detail: 'PC-09 · Khách vãng lai' },
    { id: 4, time: ago(25), user: 'Lê Nhật Duy', role: 'Thu ngân' as Role, action: 'Tạo đơn hàng', target: 'DH-10528', detail: '3 sản phẩm · 51.000 ₫' },
    { id: 3, time: ago(155), user: 'Lê Nhật Duy', role: 'Thu ngân' as Role, action: 'Kết thúc phiên', target: 'PS-240517', detail: 'PC-12 · 69.000 ₫' },
    { id: 2, time: ago(190), user: 'Trương Thiện Thư', role: 'Quản lý' as Role, action: 'Điều chỉnh tồn', target: 'SP-003', detail: '-2 · Lý do: Hàng hỏng' },
    { id: 1, time: ago(380), user: 'Lê Nhật Duy', role: 'Thu ngân' as Role, action: 'Báo sự cố', target: 'BT-0058', detail: 'PC-04 · Bàn phím chập phím W' },
  ]

  const suppliers = [
    { id: 'NCC-01', name: 'Đại lý nước giải khát Hưng Phát', phone: '028 3822 1190', items: 'Sting, Coca-Cola, Nước suối', active: true },
    { id: 'NCC-02', name: 'Siêu thị sỉ Thành Đạt', phone: '028 3930 7712', items: 'Mì ly, Bánh, Khoai tây', active: true },
    { id: 'NCC-03', name: 'Cửa hàng đồ uống Minh Long', phone: '0909 118 442', items: 'Cà phê lon, Trà', active: true },
    { id: 'NCC-04', name: 'Công ty thẻ game Việt Pay', phone: '1900 5588', items: 'Thẻ Garena, Zing', active: false },
  ]

  const stockMoves = [
    { id: 'NK-0231', pid: 'SP-001', type: 'in' as const, qty: 48, note: 'Nhập từ Hưng Phát', time: now - 30 * HOUR, by: 'Trương Thiện Thư' },
    { id: 'NK-0230', pid: 'SP-008', type: 'in' as const, qty: 24, note: 'Nhập từ Thành Đạt', time: now - 50 * HOUR, by: 'Trương Thiện Thư' },
    { id: 'DC-0092', pid: 'SP-003', type: 'adjust' as const, qty: -2, note: 'Hàng hỏng', time: ago(190), by: 'Trương Thiện Thư' },
  ]

  const shift = { id: shiftId, user: 'Lê Nhật Duy', openAt: ago(272), openCash: 1_000_000, status: 'open' as const }
  const shifts = [
    { id: 'CA-000', user: 'Trương Thiện Thư', openAt: now - 20 * HOUR, openCash: 800000, status: 'closed' as const, closeAt: now - 12 * HOUR, expected: 2810000, counted: 2810000 },
  ]

  const backups = [
    { id: 'BK-3', name: 'altf4_auto_0300', time: now - 8 * HOUR, by: 'Hệ thống', size: '284 MB', kind: 'Tự động' as const },
    { id: 'BK-2', name: 'altf4_manual_2245', time: now - 32 * HOUR, by: 'Lê Chí Toàn', size: '281 MB', kind: 'Thủ công' as const },
    { id: 'BK-1', name: 'altf4_auto_0300', time: now - 32 * HOUR - 2 * HOUR, by: 'Hệ thống', size: '279 MB', kind: 'Tự động' as const },
  ]

  const history = [
    { d: 'T2', machine: 2_480_000, fnb: 1_020_000 },
    { d: 'T3', machine: 2_830_000, fnb: 1_140_000 },
    { d: 'T4', machine: 2_610_000, fnb: 980_000 },
    { d: 'T5', machine: 3_150_000, fnb: 1_240_000 },
    { d: 'T6', machine: 3_380_000, fnb: 1_410_000 },
    { d: 'T7', machine: 3_920_000, fnb: 1_560_000 },
    { d: 'CN', machine: 0, fnb: 0 }, // hôm nay: cộng dồn từ hóa đơn thực
  ]

  return {
    machines, sessions, members, products, orders, invoices, tickets, staff, logs,
    walletTx: [
      { id: 'NV-0412', memberId: 'HV-00214', amount: 200000, method: 'cash', time: ago(250), shiftId },
      { id: 'NV-0413', memberId: 'HV-00209', amount: 300000, method: 'transfer', time: ago(310), shiftId },
    ],
    stockMoves, suppliers, shift, shifts, backups, history,
    games: [
      { id: 'GM-001', name: 'Liên Minh Huyền Thoại', genre: 'MOBA', desc: 'Đấu trường 5v5 chiến thuật, phòng đội hình sẵn cho nhóm bạn.', zone: 'Tất cả máy' as const, tone: 'cyan' as const },
      { id: 'GM-002', name: 'Valorant', genre: 'FPS chiến thuật', desc: 'Bắn súng 5v5 đòi hỏi phản xạ nhanh, màn hình 240Hz ở khu VIP.', zone: 'Khu VIP' as const, tone: 'magenta' as const },
      { id: 'GM-003', name: 'Counter-Strike 2', genre: 'FPS', desc: 'Huyền thoại bắn súng đồng đội, chuột và bàn phím gaming riêng.', zone: 'Tất cả máy' as const, tone: 'amber' as const },
      { id: 'GM-004', name: 'PUBG', genre: 'Battle Royale', desc: 'Sinh tồn 100 người, cấu hình cao chạy mượt ở thiết lập đồ họa cao.', zone: 'Khu VIP' as const, tone: 'green' as const },
      { id: 'GM-005', name: 'FC Online', genre: 'Thể thao', desc: 'Bóng đá đối kháng, tay cầm cho thuê tại quầy.', zone: 'Khu thường' as const, tone: 'violet' as const },
      { id: 'GM-006', name: 'GTA V', genre: 'Thế giới mở', desc: 'Khám phá thành phố mở, yêu cầu card đồ họa mạnh.', zone: 'Khu VIP' as const, tone: 'violet' as const },
    ],
    settings: { venue: 'AltF4 Gaming Center', phone: '028 3821 2048', address: '45 Nguyễn Trãi, Quận 1, TP.HCM', minMinutes: 15, roundMoney: 100, lowBalance: 20000, rateVip: 15000, rateStd: 10000 },
    dayStart: ago(272),
    seq: 100,
  }
}
