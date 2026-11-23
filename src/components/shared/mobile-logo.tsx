import { Link } from 'react-router-dom'
import { AgendaquiMark } from '@/components/shared/agendaqui-mark'

export function MobileLogo() {
  return (
    <div className="mb-8 lg:hidden">
      <Link to="/" className="inline-flex items-center gap-2 text-lg font-bold text-ink font-display">
        <AgendaquiMark className="h-8 w-8 rounded-lg" />
        Agendaqui
      </Link>
    </div>
  )
}
