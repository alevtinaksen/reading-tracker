import { useState } from 'react'
import { Toaster } from 'sonner'
import { BookFormModal } from './components/BookFormModal'
import { BottomAddButton } from './components/BottomAddButton'
import { ConfirmDialog } from './components/ConfirmDialog'
import { Dashboard } from './components/Dashboard'
import { Library } from './components/Library'
import { TopNav } from './components/TopNav'
import { EMPTY_BOOK } from './constants'
import { useBooks } from './hooks/useBooks'

function App() {
  const { books, tags, loading, error, upsertBook, removeBook, markAsRead, importBooks } =
    useBooks()
  const [page, setPage] = useState('library')
  const [statusFilter, setStatusFilter] = useState('all')
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  function openCreate() {
    setEditing({ ...EMPTY_BOOK, tags: [] })
  }

  function openCreateWithStatus(status) {
    const isNoRating = status === 'want_to_read' || status === 'abandoned'
    setEditing({
      ...EMPTY_BOOK,
      tags: [],
      status,
      rating: isNoRating ? null : 7,
      readMonth: status === 'want_to_read' ? null : new Date().getMonth() + 1,
      readYear: status === 'want_to_read' ? null : new Date().getFullYear(),
    })
  }

  function openEdit(book) {
    setEditing({ ...book, tags: [...(book.tags ?? [])] })
  }

  function requestDelete(id) {
    setDeleteTarget(id)
  }

  function confirmDelete() {
    if (deleteTarget != null) {
      removeBook(deleteTarget)
      setEditing(null)
    }
    setDeleteTarget(null)
  }

  return (
    <div className="min-h-svh bg-[#F5F5F5] text-gray-900">
      {/* 1. Верхнее навигационное меню (всегда по центру) */}
      <TopNav current={page} onNavigate={setPage} />

      {/* 2. Основной контент */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 pb-32">
        {loading ? (
          <p className="text-sm font-medium text-gray-500">Загрузка…</p>
        ) : (
          <>
            {error ? (
              <p className="mb-4 rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm font-medium text-gray-600">
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
                onDelete={requestDelete}
                onAdd={openCreate}
                onImportBooks={importBooks}
              />
            )}
          </>
        )}
      </main>

      {/* 3. Кнопка (+) внизу по центру только в разделе «Библиотека» */}
      {page === 'library' ? (
        <BottomAddButton onAdd={openCreate} onQuickAdd={openCreateWithStatus} />
      ) : null}

      {/* 4. Модальное окно добавления/редактирования книги */}
      {editing ? (
        <BookFormModal
          key={editing.id || 'new'}
          book={editing}
          books={books}
          tags={tags}
          onClose={() => setEditing(null)}
          onSave={(book) => {
            upsertBook(book)
            setEditing(null)
            setPage('library')
          }}
          onDelete={requestDelete}
        />
      ) : null}

      <ConfirmDialog
        open={deleteTarget != null}
        title="Удалить книгу?"
        message="Вы уверены? Это действие нельзя будет отменить."
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <Toaster position="bottom-left" />
    </div>
  )
}

export default App
