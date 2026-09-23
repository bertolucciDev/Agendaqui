import { Link } from 'react-router-dom'

export function MobileLogo() {
  return (
    <div className="mb-8 lg:hidden">
      <Link to="/" className="inline-flex items-center gap-2 text-lg font-bold text-ink font-display">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
          A
        </div>
        Agendaqui
      </Link>
    </div>
  )
}
