import type { UserRole } from '@/types/domain';

export type NavigationItem = {
  href: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
  phase?: number;
};

const NAVIGATION_ITEMS: NavigationItem[] = [
  { href: '/dashboard', label: 'Home', icon: 'home' },
  { href: '/dashboard/approval', label: 'Aprovacao', icon: 'clipboard-check', adminOnly: true },
  { href: '/dashboard/assets', label: 'Assets', icon: 'trees' },
  { href: '/dashboard/manejos', label: 'Manejos', icon: 'scissors' },
  { href: '/dashboard/monitoramentos', label: 'Monitoramentos', icon: 'activity' },
  { href: '/dashboard/map', label: 'Mapa', icon: 'map' },
  { href: '/dashboard/users', label: 'Usuarios', icon: 'users', adminOnly: true },
  { href: '/dashboard/asset-types', label: 'Tipos de Asset', icon: 'tags', adminOnly: true },
  { href: '/dashboard/audit', label: 'Auditoria', icon: 'shield-check', adminOnly: true },
  { href: '/dashboard/reports', label: 'Relatorios', icon: 'file-bar-chart', adminOnly: true, phase: 3 },
];

export function getNavigationItemsForRole(role: UserRole): NavigationItem[] {
  if (role === 'admin') {
    return NAVIGATION_ITEMS;
  }
  return NAVIGATION_ITEMS.filter((item) => !item.adminOnly && item.phase !== 3);
}
