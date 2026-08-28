import { useEffect, useState } from 'react'
import { Toaster, toast } from 'sonner'
import { BookFormModal } from './components/BookFormModal'
import { BottomAddButton } from './components/BottomAddButton'
import { ConfirmDialog } from './components/ConfirmDialog'
import { Dashboard } from './components/Dashboard'
import { Library } from './components/Library'
import { TopNav } from './components/TopNav'
import { EMPTY_BOOK, STATUS } from './constants'
import { useBooks } from './hooks/useBooks'

function getInitialStateFromUrl() {
  if (typeof window === 'undefined') return { page: 'library', status: 'all' }

  const searchParams = new URLSearchParams(window.location.search)
  const hash = window.location.hash.replace('#', '')

  const tab = searchParams.get('tab') || hash
  if (tab === 'dashboard') {
    return { page: 'dashboard', status: 'all' }
  }

  const rawStatus = searchParams.get('status') || (hash.startsWith('status=') ? hash.replace('status=', '') : hash)
  const validStatuses = ['want_to_read', 'reading', 'read', 'abandoned', 'all']

  if (rawStatus === 'wishlist' || rawStatus === 'wantToRead') {
    return { page: 'library', status: 'want_to_read' }
  }

  if (validStatuses.includes(rawStatus)) {
    return { page: 'library', status: rawStatus }
  }

  return { page: 'library', status: 'all' }
}

function App() {
  const { books, tags, loading, error, upsertBook, removeBook, markAsRead, importBooks } =
    useBooks()

  const initial = getInitialStateFromUrl()
  const [page, setPage] = useState(initial.page)
  const [statusFilter, setStatusFilter] = useState(initial.status)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Синхронизация URL при изменении страницы или фильтра
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)

    if (page === 'dashboard') {
      url.search = '?tab=dashboard'
      url.hash = ''
    } else {
      if (statusFilter && statusFilter !== 'all') {
        url.search = `?status=${statusFilter}`
        url.hash = ''
      } else {
        url.search = ''
        url.hash = ''
      }
    }
    window.history.replaceState({}, '', url.toString())
  }, [page, statusFilter])

  // Слушатель событий истории браузера (кнопки Вперёд/Назад)
  useEffect(() => {
    function handlePopState() {
      const state = getInitialStateFromUrl()
      setPage(state.page)
      setStatusFilter(state.status)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function handleNavigate(newPage) {
    setPage(newPage)
  }

  function handleStatusFilter(newStatus) {
    setStatusFilter(newStatus)
    setPage('library')
  }

  function openCreate() {
    setEditing({ ...EMPTY_BOOK, tags: [] })
  }

  function openCreateWithStatus(status) {
    setEditing({
      ...EMPTY_BOOK,
      tags: [],
      status,
      rating: null,
      readMonth: status === STATUS.wantToRead ? null : new Date().getMonth() + 1,
      readYear: status === STATUS.wantToRead ? null : new Date().getFullYear(),
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
      <TopNav current={page} onNavigate={handleNavigate} />

      {/* 2. Основной контент */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 pb-32">
        {loading && books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-900 border-t-transparent mb-3" />
            <p className="text-sm font-semibold text-gray-500">Загрузка библиотеки…</p>
          </div>
        ) : (
          <>
            {error ? (
              <p className="mb-4 rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm font-medium text-gray-600">
                {error}
              </p>
            ) : null}
            {page === 'dashboard' ? (
              <Dashboard books={books} page={page} onNavigate={handleNavigate} />
            ) : (
              <Library
                books={books}
                statusFilter={statusFilter}
                onStatusFilter={handleStatusFilter}
                onEdit={openEdit}
                onMarkRead={markAsRead}
                onDelete={requestDelete}
                onAdd={openCreate}
                onImportBooks={importBooks}
                page={page}
                onNavigate={handleNavigate}
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

      {/* Уведомления toast */}
      <Toaster
        position="top-center"
        richColors
        closeButton
        toastOptions={{
          className: '!rounded-2xl !shadow-[0_12px_40px_rgba(0,0,0,0.18)] !border-gray-200 !font-semibold !text-xs !py-3',
        }}
      />
    </div>
  )
}

export default App
