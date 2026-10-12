import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-6">
      <nav className="max-w-6xl mx-auto px-6 flex flex-wrap gap-6 text-sm text-gray-400">
        <Link href="/" className="hover:text-white">Elections</Link>
        <Link href="/nomination/apply" className="hover:text-white">Request nomination</Link>
      </nav>
    </footer>
  )
}
