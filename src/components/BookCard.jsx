import { useEffect, useRef, useState } from 'react'
import { BookMarked, Check, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { STATUS, formatLabel, formatReadPeriod, statusLabel } from '../constants'
import { StatusBadge } from './StatusBadge'

const TAG_TONES = [
  'bg-sky-100 text-sky-800',
  'bg-amber-100 text-amber-800',
  'bg-fuchsia-100 text-fuchsia-800',
  'bg-emerald-100 text-emerald-800',
  'bg-indigo-100 text-indigo-800',
]

export function BookCard({ book, menuOpen, onToggleMenu, onEdit, onMarkRead, onDelete }) {
  const [coverFailed, setCoverFailed] = useState(false)
  const menuRef = useRef(null)
  const showCover = Boolean(book.coverUrl) && !coverFailed
  const period = formatReadPeriod(book)

  useEffect(() => {
    if (!menuOpen) return undefined
    function onPointer(event) {
      if (!menuRef.current?.contains(event.target)) onToggleMenu(null)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [menuOpen, onToggleMenu])

  return (
    <article className="relative flex flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_16px_40px_rgba(28,25,23,0.08)]">
      <div className="relative aspect-[3/4] bg-stone-100">
        <button
          type="button"
          onClick={() => onEdit(book)}
          className="absolute inset-0"
          aria-label={`Открыть ${book.title}`}
        >
          {showCover ? (
            <img
              src={book.coverUrl}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setCoverFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-stone-400">
              <BookMarked size={22} strokeWidth={1.5} />
              <span className="px-4 text-center text-[11px] font-medium">Нет обложки</span>
            </div>
          )}
        </button>

        <div ref={menuRef} className="absolute top-3 right-3 z-10">
          <button
            type="button"
            aria-label="Действия"
            onClick={(event) => {
              event.stopPropagation()
              onToggleMenu(menuOpen ? null : book.id)
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-stone-700 shadow-[0_8px_20px_rgba(28,25,23,0.12)] backdrop-blur-sm hover:bg-white"
          >
            <MoreHorizontal size={18} />
          </button>
          {menuOpen ? (
            <div className="absolute top-11 right-0 w-52 rounded-2xl bg-white p-1.5 shadow-[0_18px_50px_rgba(28,25,23,0.16)]">
              <MenuItem
                icon={Pencil}
                onClick={() => {
                  onToggleMenu(null)
                  onEdit(book)
                }}
              >
                Редактировать
              </MenuItem>
              {book.status !== STATUS.read ? (
                <MenuItem
                  icon={Check}
                  onClick={() => {
                    onToggleMenu(null)
                    onMarkRead(book.id)
                  }}
                >
                  Отметить прочитанным
                </MenuItem>
              ) : null}
              <MenuItem
                icon={Trash2}
                danger
                onClick={() => {
                  onToggleMenu(null)
                  onDelete(book.id)
                }}
              >
                Удалить
              </MenuItem>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <StatusBadge status={book.status} label={statusLabel(book.status)} />
          <span className="text-sm font-bold tabular-nums text-stone-900">{book.rating}/10</span>
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-base font-extrabold tracking-tight text-stone-950">
            {book.title}
          </h3>
          <p className="mt-0.5 truncate text-sm text-stone-500">{book.author}</p>
        </div>
        {book.tags?.length ? (
          <div className="flex flex-wrap gap-1">
            {book.tags.slice(0, 2).map((tag, index) => (
              <span
                key={tag}
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TAG_TONES[index % TAG_TONES.length]}`}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <p className="mt-auto text-xs font-medium text-stone-400">
          {period || 'Месяц не указан'} · {formatLabel(book.format)}
        </p>
      </div>
    </article>
  )
}

function MenuItem({ icon: Icon, onClick, danger = false, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-stone-800 hover:bg-stone-100'
      }`}
    >
      <Icon size={15} />
      {children}
    </button>
  )
}
