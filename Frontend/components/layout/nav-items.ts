import { Activity, History, Info, LayoutDashboard, Stethoscope, type LucideIcon } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/predict', label: 'New Prediction', icon: Stethoscope },
  { href: '/history', label: 'Prediction History', icon: History },
  { href: '/model-status', label: 'Model & API Status', icon: Activity },
  { href: '/about', label: 'About CareSense', icon: Info },
]

export function findNavItem(pathname: string) {
  return NAV_ITEMS.find((i) => (i.href === '/' ? pathname === '/' : pathname.startsWith(i.href))) ?? NAV_ITEMS[0]
}
