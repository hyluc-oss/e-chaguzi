'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

interface NavBarProps {
  scrolled?: boolean
}

export default function NavBar({ scrolled = false }: NavBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const navLinks = [
    { href: '/', label: 'Elections' },
    { href: '/nomination/apply', label: 'Request Nomination' },
    { href: '/results', label: 'Results' },
  ]

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/auth/login')
    router.refresh()
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'glass border-b border-white/5 py-3' : 'py-5'
    }`}>
      {/* Scroll progress */}
      <div className="scroll-progress" aria-hidden="true" />
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div
            className="brand-mark w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm"
            style={{ background: '#2457C5' }}
          >
            eC
          </div>
          <div>
            <span className="font-black text-foreground text-lg leading-none">e-Chaguzi</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${pathname === link.href ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-3">
          <button type="button" onClick={signOut} className="btn-ghost text-sm py-2 px-4">Sign out</button>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 text-gray-700 hover:text-primary transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
          id="mobile-menu-btn"
        >
          {mobileOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden glass border-t border-white/5 px-6 py-4 animate-slide-up">
          <div className="flex flex-col gap-2">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'text-primary-400 bg-primary-400/10'
                    : 'text-gray-700 hover:text-primary hover:bg-primary/5'
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="divider my-2" />
            <button type="button" onClick={signOut} className="btn-ghost text-sm w-full">Sign out</button>
          </div>
        </div>
      )}
    </nav>
  )
}
