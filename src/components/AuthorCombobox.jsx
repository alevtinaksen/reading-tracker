import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronsUpDown } from 'lucide-react'

export function AuthorCombobox({ value = '', onChange, authors = [], existingAuthors, placeholder }) {
  const list = existingAuthors ?? authors ?? []
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  const suggestions = useMemo(() => {
    const query = (value || '').trim().toLowerCase()
    if (!query) return list
    return list.filter((author) => (author || '').toLowerCase().includes(query))
  }, [list, value])

  useEffect(() => {
    function onPointer(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [])

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <input
          value={value}
          onChange={(event) => {
            onChange(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
          placeholder={placeholder}
          autoComplete="off"
        />
        <ChevronsUpDown
          size={16}
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-400"
        />
      </div>
      {open ? (
        <ul className="absolute z-20 mt-2 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-100 bg-white p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.08)]">
          {suggestions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500">
              Новый автор: «{value.trim() || '…'}»
            </li>
          ) : (
            suggestions.map((author) => (
              <li key={author}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(author)
                    setOpen(false)
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  {author}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  )
}
