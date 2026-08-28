import { useState } from 'react'
import { Plus } from 'lucide-react'
import { STATUS_OPTIONS } from '../constants'

export function QuickAddFab({ onSelect }) {
  const [open, setOpen] = useState(false)
  const count = STATUS_OPTIONS.length

  function handlePointerEnter(event) {
    if (event.pointerType === 'mouse') setOpen(true)
  }

  function handlePointerLeave(event) {
    if (event.pointerType === 'mouse') setOpen(false)
  }

  return (
    <div
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <div className={`flex flex-col items-center gap-2 ${open ? '' : 'pointer-events-none'}`}>
        {STATUS_OPTIONS.map((option, index) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              setOpen(false)
              onSelect(option.value)
            }}
            style={{
              transitionDelay: open ? `${(count - 1 - index) * 40}ms` : `${index * 40}ms`,
            }}
            className={`flex items-center justify-center gap-2.5 whitespace-nowrap rounded-full border border-[#F4F4F4] bg-white p-2.5 text-sm text-[#000] shadow-[0_4px_40px_0_rgba(0,0,0,0.10)] transition-all duration-200 ${
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
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 text-white shadow-lg transition-colors hover:bg-gray-800"
      >
        <Plus size={24} className={`transition-transform duration-200 ${open ? 'rotate-45' : ''}`} />
      </button>
    </div>
  )
}
