'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ComponentType, type SVGProps } from 'react';
import {
  Activity,
  ClipboardCheck,
  FileBarChart,
  Home,
  LogOut,
  Map,
  Menu,
  Scissors,
  ShieldCheck,
  Tags,
  Trees,
  Users,
  X,
} from 'lucide-react';

import { getNavigationItemsForRole } from '@/lib/auth/navigation';
import type { User } from '@/types/domain';

const ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  activity: Activity,
  'clipboard-check': ClipboardCheck,
  'file-bar-chart': FileBarChart,
  home: Home,
  map: Map,
  scissors: Scissors,
  'shield-check': ShieldCheck,
  tags: Tags,
  trees: Trees,
  users: Users,
};

const ROLE_LABELS = {
  admin: 'ADMIN',
  tech: 'TECH',
  viewer: 'VIEWER',
} as const;

export function DashboardShell({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const items = getNavigationItemsForRole(user.role);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="app-shell min-h-screen text-on-background">
      <button
        type="button"
        aria-label="Abrir navegacao"
        onClick={() => setOpen(true)}
        className="fixed left-5 top-5 z-50 grid h-11 w-11 place-items-center rounded-full bg-surface-container-lowest shadow-lg shadow-black/5 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside
        className={`sidebar-shell fixed inset-y-0 left-0 z-50 w-72 px-5 py-6 transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-8 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setOpen(false)}>
            <span className="brand-mark grid h-12 w-12 place-items-center rounded-[20px] text-secondary">
              <Trees className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-lg font-extrabold text-primary">EcoInventario</span>
              <span className="text-xs font-semibold uppercase text-secondary">PRO Dashboard</span>
            </span>
          </Link>
          <button
            type="button"
            aria-label="Fechar navegacao"
            onClick={() => setOpen(false)}
            className="grid h-10 w-10 place-items-center rounded-full bg-surface-container lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-2" aria-label="Navegacao principal">
          <p className="mb-1 px-4 text-[11px] font-bold uppercase text-outline">Operacao</p>
          {items.map((item) => {
            const Icon = ICONS[item.icon] ?? Home;
            const isActive =
              item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex h-12 items-center gap-3 rounded-full px-4 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-primary text-on-primary shadow-lg shadow-black/10'
                    : 'text-on-surface-variant hover:bg-white/60 hover:text-primary'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 rounded-[24px] border border-white/70 bg-white/45 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-secondary">Sessao ativa</p>
          <p className="mt-2 truncate text-sm font-semibold text-primary">{user.email}</p>
          <p className="mt-1 text-xs font-semibold text-on-surface-variant">{ROLE_LABELS[user.role]}</p>
        </div>
      </aside>

      {open ? (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div className="lg:pl-72">
        <header className="topbar-shell sticky top-0 z-30 px-5 py-4 lg:px-12">
          <div className="ml-14 flex items-center justify-between gap-4 lg:ml-0">
            <div className="hidden min-w-0 lg:block">
              <p className="text-xs font-bold uppercase text-secondary">Painel operacional</p>
              <p className="truncate text-sm font-semibold text-on-surface-variant">
                Dados em tempo real da organizacao
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-primary">{user.name}</p>
                <p className="text-xs font-semibold text-on-surface-variant">
                  {ROLE_LABELS[user.role]}
                </p>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-[18px] bg-secondary-container text-sm font-bold text-secondary shadow-sm">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="grid h-11 w-11 place-items-center rounded-full bg-surface-container-lowest text-on-surface-variant shadow-sm transition hover:text-primary"
                aria-label="Sair"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-5 py-10 lg:px-12">{children}</main>
      </div>
    </div>
  );
}
