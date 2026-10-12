'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const links = [
  { label: 'Overview', href: '/admin' },
  { label: 'Nominations', href: '/admin/nominations' },
  { label: 'Elections', href: '/admin/elections' },
  { label: 'Tally & audit', href: '/admin/tally' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/auth/login')
    router.refresh()
  }

  return (
    <aside className="app-sidebar w-64 bg-sidebar text-sidebar-foreground min-h-screen flex flex-col p-4">
      <Link href="/admin" className="sidebar-brand flex items-center gap-3 px-4 py-6 mb-2 font-bold text-xl">
        <span className="w-8 h-8 rounded-lg bg-accent text-sidebar-accent-foreground flex items-center justify-center">eC</span>
        e-Chaguzi
      </Link>
      <nav className="flex-1 space-y-1" aria-label="Admin navigation">
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={pathname === link.href ? 'page' : undefined}
            className={`block px-4 py-3 rounded-xl transition-colors ${
              pathname === link.href
                ? 'bg-accent text-sidebar-accent-foreground font-semibold'
                : 'text-sidebar-foreground/70 hover:bg-primary/5 hover:text-primary'
            }`}
          >
            <span className="text-sm">{link.label}</span>
          </Link>
        ))}
      </nav>
      <button type="button" onClick={signOut} className="sidebar-footer px-4 py-3 text-left text-sidebar-foreground/70 hover:text-primary">
        Sign out
      </button>
    </aside>
  )
}
