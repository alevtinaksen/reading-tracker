import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronsUpDown } from 'lucide-react'

export function AuthorCombobox({ value, onChange, authors, placeholder }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  const suggestions = useMemo(() => {
    const query = value.trim().toLowerCase()
    if (!query) return authors
    return authors.filter((author) => author.toLowerCase().includes(query))
  }, [authors, value])

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
          className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2.5 pr-10 text-sm text-stone-950 outline-none placeholder:text-stone-400 focus:border-stone-300 focus:bg-white"
          placeholder={placeholder}
          autoComplete="off"
        />
        <ChevronsUpDown
          size={16}
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-stone-400"
        />
      </div>
      {open ? (
        <ul className="absolute z-20 mt-2 max-h-48 w-full overflow-y-auto rounded-2xl bg-white p-1.5 shadow-[0_18px_50px_rgba(28,25,23,0.14)]">
          {suggestions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-stone-500">
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
                  className="w-full rounded-xl px-3 py-2 text-left text-sm text-stone-800 hover:bg-stone-100"
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
