import { useEffect, useRef, useState } from 'react'
import { Loader2, Plus, Sparkles, X } from 'lucide-react'

export function TagMultiSelect({
  value = [],
  onChange,
  options = [],
  placeholder = 'Добавить тег…',
  onAutoDetect,
  isDetecting = false,
  canAutoDetect = false,
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  const selected = value ?? []

  const q = query.trim().toLowerCase()
  const available = options.filter((option) => !selected.includes(option))
  const suggestions = q
    ? available.filter((option) => option.toLowerCase().includes(q))
    : available

  const showCreate = query.trim().length > 0 && !options.includes(query.trim())

  useEffect(() => {
    function onPointer(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [])

  function add(tag) {
    const trimmed = tag.trim()
    if (!trimmed || selected.includes(trimmed)) return
    onChange([...selected, trimmed])
    setQuery('')
  }

  function remove(tag) {
    onChange(selected.filter((item) => item !== tag))
  }

  function onKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (query.trim()) add(query.trim())
    } else if (event.key === 'Backspace' && query === '') {
      if (selected.length) onChange(selected.slice(0, -1))
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="flex min-h-[46px] flex-wrap items-center gap-1.5 rounded-xl border border-gray-200 bg-white pl-3.5 pr-1.5 py-1.5 transition-all focus-within:border-gray-900 focus-within:ring-1 focus-within:ring-gray-900">
        {selected.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              aria-label={`Убрать ${tag}`}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={selected.length ? '' : placeholder}
          className="min-w-20 flex-1 bg-transparent px-1 py-1 text-sm text-gray-900 outline-none placeholder:text-gray-400"
        />

        {/* Правая панель действий: сброс всех тегов и кнопка авто-определения */}
        <div className="ml-auto flex items-center gap-1 shrink-0">
          {selected.length > 0 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onChange([])
              }}
              title="Очистить все теги"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-900 active:scale-95 cursor-pointer"
            >
              <X size={14} strokeWidth={2} />
            </button>
          ) : null}

          {onAutoDetect ? (
            <button
              type="button"
              disabled={isDetecting || !canAutoDetect}
              onClick={onAutoDetect}
              title={canAutoDetect ? 'Автоматически определить жанры' : 'Сначала введите название книги'}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-800 transition-all hover:bg-gray-200 hover:text-gray-900 disabled:opacity-35 disabled:cursor-not-allowed active:scale-95 shrink-0 cursor-pointer"
            >
              {isDetecting ? (
                <Loader2 size={15} className="animate-spin text-gray-900" />
              ) : (
                <Sparkles size={15} className="text-gray-900" />
              )}
            </button>
          ) : null}
        </div>
      </div>

      {open ? (
        <ul className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-xl border border-gray-100 bg-white p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.08)]">
          {suggestions.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                onClick={() => add(tag)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                {tag}
                <Plus size={14} className="text-gray-400" />
              </button>
            </li>
          ))}
          {showCreate ? (
            <li>
              <button
                type="button"
                onClick={() => add(query.trim())}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-900 hover:bg-gray-50"
              >
                <span className="text-gray-400">Создать</span> «{query.trim()}»
              </button>
            </li>
          ) : null}
          {suggestions.length === 0 && !showCreate ? (
            <li className="px-3 py-2 text-sm text-gray-500">Нет тегов</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}
