import { useCallback, useEffect, useState } from 'react'
import { roleRank, type Role } from './types'

export type PageId =
  | 'hub' | 'machines' | 'sessions' | 'orders' | 'members' | 'invoices' | 'shifts' | 'maintenance'
  | 'products' | 'inventory' | 'staff' | 'dashboard' | 'reports' | 'settings' | 'audit' | 'backup'

export interface NavItem { id: PageId; label: string; icon: string; group: string; min: Role; hint: string }

export const NAV: NavItem[] = [
  { id: 'hub', label: 'Tổng hợp', icon: 'home', group: 'TỔNG QUAN', min: 'Thu ngân', hint: 'Lối tắt đến mọi chức năng' },
  { id: 'machines', label: 'Sơ đồ máy', icon: 'monitor', group: 'VẬN HÀNH', min: 'Thu ngân', hint: 'Trạng thái máy, mở & kết thúc phiên' },
  { id: 'sessions', label: 'Phiên sử dụng', icon: 'clock', group: 'VẬN HÀNH', min: 'Thu ngân', hint: 'Lịch sử và phiên đang mở' },
  { id: 'orders', label: 'Đơn hàng', icon: 'cart', group: 'VẬN HÀNH', min: 'Thu ngân', hint: 'Gọi món, đồ ăn & thức uống' },
  { id: 'members', label: 'Hội viên', icon: 'users', group: 'VẬN HÀNH', min: 'Thu ngân', hint: 'Đăng ký, nạp ví, số dư' },
  { id: 'invoices', label: 'Hóa đơn', icon: 'receipt', group: 'VẬN HÀNH', min: 'Thu ngân', hint: 'Thanh toán và hoàn tiền' },
  { id: 'shifts', label: 'Ca làm việc', icon: 'wallet', group: 'VẬN HÀNH', min: 'Thu ngân', hint: 'Mở ca, kết ca, đối chiếu tiền mặt' },
  { id: 'maintenance', label: 'Bảo trì', icon: 'wrench', group: 'VẬN HÀNH', min: 'Thu ngân', hint: 'Báo sự cố và phiếu sửa chữa' },
  { id: 'products', label: 'Sản phẩm', icon: 'box', group: 'KINH DOANH', min: 'Quản lý', hint: 'Danh mục và giá bán' },
  { id: 'inventory', label: 'Kho hàng', icon: 'warehouse', group: 'KINH DOANH', min: 'Quản lý', hint: 'Tồn kho, nhập kho, nhà cung cấp' },
  { id: 'staff', label: 'Nhân viên', icon: 'staff', group: 'KINH DOANH', min: 'Quản lý', hint: 'Tài khoản và phân quyền' },
  { id: 'dashboard', label: 'Dashboard', icon: 'grid', group: 'PHÂN TÍCH', min: 'Quản lý', hint: 'Tổng quan doanh thu' },
  { id: 'reports', label: 'Báo cáo', icon: 'chart', group: 'PHÂN TÍCH', min: 'Quản lý', hint: 'Xuất CSV, in báo cáo' },
  { id: 'settings', label: 'Cấu hình', icon: 'settings', group: 'HỆ THỐNG', min: 'Quản trị viên', hint: 'Quy tắc tính phí, thông tin quán' },
  { id: 'audit', label: 'Nhật ký', icon: 'log', group: 'HỆ THỐNG', min: 'Quản trị viên', hint: 'Nhật ký thao tác' },
  { id: 'backup', label: 'Sao lưu', icon: 'database', group: 'HỆ THỐNG', min: 'Quản trị viên', hint: 'Sao lưu và phục hồi' },
]

export const canSee = (role: Role, id: PageId) => roleRank[role] >= roleRank[NAV.find((n) => n.id === id)!.min]

const parse = (): PageId => {
  const h = window.location.hash.replace(/^#\/?/, '')
  return (NAV.find((n) => n.id === h)?.id ?? 'hub') as PageId
}

/** Điều hướng bằng hash (#/machines) → có thể nút Back của trình duyệt, F5 giữ nguyên trang */
export function useRoute(): [PageId, (id: PageId) => void] {
  const [route, setRoute] = useState<PageId>(parse)
  useEffect(() => {
    const on = () => setRoute(parse())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const go = useCallback((id: PageId) => { window.location.hash = `/${id}` }, [])
  return [route, go]
}
