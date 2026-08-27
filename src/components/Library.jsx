import { useState } from 'react'
import { STATUS_OPTIONS } from '../constants'
import { BookCard } from './BookCard'

export function Library({
  books,
  statusFilter,
  onStatusFilter,
  onEdit,
  onMarkRead,
  onDelete,
}) {
  const [menuId, setMenuId] = useState(null)
  const visible =
    statusFilter === 'all'
      ? books
      : books.filter((book) => book.status === statusFilter)

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-stone-400">Каталог</p>
          <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-stone-950">
            Библиотека
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip active={statusFilter === 'all'} onClick={() => onStatusFilter('all')}>
            Все
          </FilterChip>
          {STATUS_OPTIONS.map((option) => (
            <FilterChip
              key={option.value}
              active={statusFilter === option.value}
              onClick={() => onStatusFilter(option.value)}
            >
              {option.label}
            </FilterChip>
          ))}
        </div>
      </header>

      {visible.length === 0 ? (
        <div className="rounded-[2rem] bg-white px-6 py-16 text-center shadow-[0_16px_40px_rgba(28,25,23,0.08)]">
          <p className="text-sm font-medium text-stone-500">В этой выборке нет книг.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {visible.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              menuOpen={menuId === book.id}
              onToggleMenu={setMenuId}
              onEdit={onEdit}
              onMarkRead={onMarkRead}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
        active
          ? 'bg-stone-950 text-white'
          : 'bg-white text-stone-600 shadow-[0_8px_24px_rgba(28,25,23,0.06)] hover:text-stone-950'
      }`}
    >
      {children}
    </button>
  )
}
