import { Menu } from 'lucide-react'

export default function TopBar({ onMenuClick }) {
  return (
    <header
      className="flex items-center h-14 px-4 shrink-0 min-[900px]:hidden"
      style={{ backgroundColor: '#0050AA' }}
    >
      <button
        onClick={onMenuClick}
        className="text-white p-1 mr-3 rounded"
        aria-label="Menü"
      >
        <Menu size={24} />
      </button>
      <img src="/logo-wordmark.png" alt="Merkio" className="h-9 w-auto" />
    </header>
  )
}
