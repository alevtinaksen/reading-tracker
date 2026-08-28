import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { STATUS_OPTIONS } from '../constants'

const NAV_ITEMS = [
  {
    id: 'library',
    label: 'Библиотека',
  },
  {
    id: 'dashboard',
    label: 'Дашборд',
  },
]

export function FloatingNav({ current, onNavigate, onQuickAdd }) {
  const [open, setOpen] = useState(false)
  const closeTimerRef = useRef(null)
  const fabContainerRef = useRef(null)
  const count = STATUS_OPTIONS.length

  function handleMouseEnter() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setOpen(true)
  }

  function handleMouseLeave() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
    }
    closeTimerRef.current = setTimeout(() => {
      setOpen(false)
    }, 280)
  }

  useEffect(() => {
    function onPointerDown(event) {
      if (fabContainerRef.current && !fabContainerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  return (
    <div className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2">
      {/* Навигационный белый блок с названиями */}
      <nav
        aria-label="Основная навигация"
        className="flex h-14 items-center gap-1.5 rounded-full border border-gray-100/80 bg-white p-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.10)]"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = current === item.id

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex h-full items-center justify-center rounded-full px-5 text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Кнопка быстрого добавления (+) только на вкладке Библиотека */}
      {current === 'library' ? (
        <div
          ref={fabContainerRef}
          className="relative flex flex-col items-center"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Выпадающее меню быстрых статусов с невидимым мостом (pb-3) */}
          <div
            className={`absolute bottom-full pb-3 flex flex-col items-center gap-2 transition-all duration-200 ${
              open ? 'pointer-events-auto opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2'
            }`}
          >
            {STATUS_OPTIONS.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setOpen(false)
                  onQuickAdd(option.value)
                }}
                style={{
                  transitionDelay: open ? `${(count - 1 - index) * 30}ms` : `${index * 30}ms`,
                }}
                className={`flex items-center justify-center whitespace-nowrap rounded-full border border-gray-100/80 bg-white px-5 py-2.5 text-[14px] font-medium text-gray-900 shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all duration-200 hover:bg-gray-50 hover:scale-105 active:scale-95 ${
                  open ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            aria-label="Добавить книгу"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 text-white shadow-[0_10px_35px_rgba(0,0,0,0.18)] transition-all duration-200 hover:bg-gray-800 active:scale-95"
          >
            <Plus
              size={24}
              className={`transition-transform duration-200 ${open ? 'rotate-45' : ''}`}
            />
          </button>
        </div>
      ) : null}
    </div>
  )
}
