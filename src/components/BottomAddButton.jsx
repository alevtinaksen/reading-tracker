import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { STATUS_OPTIONS } from '../constants'

export function BottomAddButton({ onAdd, onQuickAdd }) {
  const [open, setOpen] = useState(false)
  const closeTimerRef = useRef(null)
  const containerRef = useRef(null)

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
      if (containerRef.current && !containerRef.current.contains(event.target)) {
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
    <div
      ref={containerRef}
      className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Выпадающее меню быстрых статусов с невидимым мостом (pb-3) */}
      <div
        className={`absolute bottom-full pb-3 flex flex-col items-center gap-2 transition-all duration-200 ${
          open ? 'pointer-events-auto opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2'
        }`}
      >
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
              onQuickAdd(option.value)
            }}
            className="flex h-12 items-center gap-3 rounded-full border border-gray-100/90 bg-white px-5 text-sm font-bold text-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.10)] transition-all duration-150 hover:bg-gray-50 hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                option.value === 'read'
                  ? 'bg-[#15803D]'
                  : option.value === 'reading'
                    ? 'bg-[#0369A1]'
                    : option.value === 'want_to_read'
                      ? 'bg-[#7C3AED]'
                      : 'bg-[#D32F2F]'
              }`}
            />
            <span>{option.label}</span>
          </button>
        ))}
      </div>

      {/* Круглая чёрная кнопка (+) */}
      <button
        type="button"
        aria-label="Добавить книгу"
        onClick={() => {
          setOpen(false)
          onAdd()
        }}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 text-white shadow-[0_10px_35px_rgba(0,0,0,0.15)] transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer"
      >
        <Plus size={22} strokeWidth={2.5} />
      </button>
    </div>
  )
}
