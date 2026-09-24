import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface MiniCalendarProps {
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
  appointmentDays?: number[]
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export function MiniCalendar({ selectedDate, onDateSelect, appointmentDays = [] }: MiniCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const isToday = (day: number) =>
    today.getDate() === day && today.getMonth() === month && today.getFullYear() === year

  const isSelected = (day: number) =>
    selectedDate?.getDate() === day &&
    selectedDate?.getMonth() === month &&
    selectedDate?.getFullYear() === year

  const hasAppointment = (day: number) => appointmentDays.includes(day)

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="btn-ghost !p-1.5" aria-label="Mês anterior">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <h2 className="text-sm font-semibold text-ink">
            {MONTHS[month]} {year}
          </h2>
          <button onClick={nextMonth} className="btn-ghost !p-1.5" aria-label="Próximo mês">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1 text-center text-xs font-medium text-ink-faint">
            {day}
          </div>
        ))}

        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="h-8" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          return (
            <button
              key={day}
              onClick={() => onDateSelect?.(new Date(year, month, day))}
              className={`relative h-8 w-full rounded-lg text-xs font-medium transition-all duration-150 ${
                isSelected(day)
                  ? 'bg-brand-500 text-white'
                  : isToday(day)
                  ? 'bg-brand-50 text-brand-600 font-bold'
                  : 'text-ink hover:bg-warm-100'
              }`}
            >
              {day}
              {hasAppointment(day) && !isSelected(day) && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-brand-400" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
