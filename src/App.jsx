import { useState } from 'react'
import { BookOpen, LayoutGrid, Plus } from 'lucide-react'
import { BookFormModal } from './components/BookFormModal'
import { Dashboard } from './components/Dashboard'
import { Library } from './components/Library'
import { EMPTY_BOOK } from './constants'
import { useBooks } from './hooks/useBooks'

const NAV = [
  { id: 'dashboard', label: 'Дашборд', icon: LayoutGrid },
  { id: 'library', label: 'Библиотека', icon: BookOpen },
]

function App() {
  const { books, loading, error, upsertBook, removeBook, markAsRead } = useBooks()
  const [page, setPage] = useState('dashboard')
  const [statusFilter, setStatusFilter] = useState('all')
  const [editing, setEditing] = useState(null)

  function openCreate() {
    setEditing({ ...EMPTY_BOOK, tags: [] })
  }

  function openEdit(book) {
    setEditing({ ...book, tags: [...(book.tags ?? [])] })
  }

  return (
    <div className="min-h-svh bg-stone-50 text-stone-900">
      <div className="mx-auto flex min-h-svh max-w-[1280px] flex-col md:flex-row md:gap-4 md:p-4">
        <aside className="bg-white md:flex md:w-60 md:shrink-0 md:flex-col md:rounded-[2rem] md:shadow-[0_16px_40px_rgba(28,25,23,0.08)]">
          <div className="flex items-center justify-between px-5 py-4 md:block md:px-6 md:py-7">
            <div>
              <p className="text-xs font-semibold tracking-wide text-stone-400 uppercase">
                Дневник
              </p>
              <p className="text-xl font-extrabold tracking-tight text-stone-950">
                Reading Log
              </p>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-full bg-stone-950 px-3.5 py-2 text-sm font-semibold text-white md:mt-6 md:w-full md:justify-center"
            >
              <Plus size={16} />
              Добавить
            </button>
          </div>
          <nav className="flex gap-1 px-3 pb-3 md:flex-1 md:flex-col md:px-3">
            {NAV.map((item) => {
              const Icon = item.icon
              const active = page === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPage(item.id)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold md:flex-none md:justify-start ${
                    active
                      ? 'bg-stone-100 text-stone-950'
                      : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'
                  }`}
                >
                  <Icon size={16} strokeWidth={2} />
                  {item.label}
                </button>
              )
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-7">
          {loading ? (
            <p className="text-sm font-medium text-stone-500">Загрузка…</p>
          ) : (
            <>
              {error ? (
                <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </p>
              ) : null}
              {page === 'dashboard' ? (
                <Dashboard books={books} />
              ) : (
                <Library
                  books={books}
                  statusFilter={statusFilter}
                  onStatusFilter={setStatusFilter}
                  onEdit={openEdit}
                  onMarkRead={markAsRead}
                  onDelete={removeBook}
                />
              )}
            </>
          )}
        </main>
      </div>

      {editing ? (
        <BookFormModal
          book={editing}
          books={books}
          onClose={() => setEditing(null)}
          onSave={(book) => {
            upsertBook(book)
            setEditing(null)
            setPage('library')
          }}
          onDelete={(id) => {
            removeBook(id)
            setEditing(null)
          }}
        />
      ) : null}
    </div>
  )
}

export default App
