'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { LogoutButton } from './logout-button';

const navigation = [
  { href: '/', label: 'Dashboard', icon: '⌂' },
  { href: '/events', label: 'Events', icon: '▣' },
  { href: '/pages', label: 'Pages & Content', icon: '▤' },
  { href: '/club-settings', label: 'Club Information', icon: '◆' },
] as const;

export function AdminFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/' || pathname === '/login') return children;

  return (
    <div className="admin-shell admin-page-shell">
      <header className="admin-topbar">
        <Link
          className="brand-mark frame-brand"
          href="/"
          aria-label="Pemberton administration dashboard"
        >
          <span className="brand-shield">P</span>
          <span>
            <b>PEMBERTON</b>
            <small>CONSERVATIVE CLUB</small>
          </span>
        </Link>
        <span className="brand-line" />
        <p className="brand-motto">More than a club. A community.</p>
        <span className="environment-chip">Demonstration</span>
        <div className="user-menu">
          <span className="avatar">A</span>
          <span>Admin User</span>
        </div>
      </header>
      <aside className="admin-sidebar page-sidebar">
        <nav aria-label="Administration">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(`${item.href}/`))
                  ? 'active'
                  : ''
              }
            >
              <span className="frame-nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-help">
          <b>Website preview</b>
          <p>Review published content on the public website.</p>
          <a href="http://localhost:3000">Open website</a>
        </div>
        <div className="sidebar-signout">
          <LogoutButton />
        </div>
        <div className="sidebar-footer">
          <small>Demo · Admin v1.0</small>
        </div>
      </aside>
      <div className="admin-page-content">{children}</div>
    </div>
  );
}
