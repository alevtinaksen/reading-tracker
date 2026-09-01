import { useEffect } from 'react'
import {
  BookOpen,
  Calendar,
  FileText,
  Headphones,
  Pencil,
  Quote,
  Smartphone,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import { FORMAT, STATUS, formatReadPeriod } from '../constants'

function getStatusBadge(status) {
  switch (status) {
    case STATUS.read:
      return { label: 'Прочитано', cls: 'bg-[#DCFFDF] text-[#15803D]' }
    case STATUS.reading:
      return { label: 'В процессе', cls: 'bg-[#E0F2FE] text-[#0369A1]' }
    case STATUS.wantToRead:
      return { label: 'Хочу прочитать', cls: 'bg-[#F3E8FF] text-[#7C3AED]' }
    case STATUS.abandoned:
      return { label: 'Брошено', cls: 'bg-[#FFE5E5] text-[#D32F2F]' }
    default:
      return { label: status, cls: 'bg-gray-100 text-gray-700' }
  }
}

export function BookDetailModal({ book, onClose, onEdit, onDelete }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!book) return null

  const statusInfo = getStatusBadge(book.status)
  const period = formatReadPeriod(book)
  const quotesList = (book.quotes || '')
    .split('\n')
    .map((q) => q.trim())
    .filter(Boolean)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center overflow-y-auto bg-black/50 p-0 sm:p-4 backdrop-blur-xs transition-opacity"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-2xl flex flex-col overflow-hidden rounded-t-[32px] sm:rounded-[28px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] max-h-[90vh] animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 duration-200"
      >
        {/* Индикатор свайпа для мобильных */}
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-gray-300 sm:hidden" />
        {/* Шапка модального окна */}
        <header className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${statusInfo.cls}`}>
              {statusInfo.label}
            </span>
            <div className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
              {book.format === FORMAT.audio ? (
                <Headphones size={12} className="text-gray-500" />
              ) : book.format === FORMAT.ebook ? (
                <Smartphone size={12} className="text-gray-500" />
              ) : (
                <BookOpen size={12} className="text-gray-500" />
              )}
              <span>{book.format === 'audio' ? 'Аудио' : book.format === 'ebook' ? 'Электронная' : 'Бумага'}</span>
            </div>
            {book.pages ? (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                {book.pages} стр.
              </span>
            ) : null}
          </div>

          <button
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
          >
            <X size={18} />
          </button>
        </header>

        {/* Тело карточки книги в журнальном стиле */}
        <div className="max-h-[75vh] overflow-y-auto p-6 sm:p-7">
          <div className="flex flex-col gap-6 sm:flex-row">
            {/* Обложка и быстрые метаданные */}
            <div className="flex shrink-0 flex-col items-center sm:w-44">
              <div className="relative aspect-[2/3] w-36 sm:w-44 overflow-hidden rounded-2xl bg-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                {book.coverUrl ? (
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-gray-400 p-4 text-center">
                    <BookOpen size={32} />
                    <span className="text-[11px] font-medium leading-tight">{book.title}</span>
                  </div>
                )}

                {/* Плашка с оценкой на обложке */}
                {book.rating ? (
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full bg-black/75 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md shadow-sm">
                    <Star size={11} className="fill-amber-400 text-amber-400" />
                    <span>{book.rating}</span>
                  </div>
                ) : null}
              </div>

              {/* Дата прочтения */}
              {period ? (
                <div className="mt-3.5 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                  <Calendar size={13} className="text-gray-400" />
                  <span>{period}</span>
                </div>
              ) : null}
            </div>

            {/* Заголовок, автор, теги и отзыв */}
            <div className="flex flex-1 flex-col">
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl leading-snug">
                {book.title}
              </h1>
              <p className="mt-1 text-base font-semibold text-gray-500">{book.author || 'Автор не указан'}</p>

              {/* Жанры и теги */}
              {book.tags?.length ? (
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {book.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700"
                    >
                      {tag.replace(/^#/, '')}
                    </span>
                  ))}
                </div>
              ) : null}

              {/* Раздел: Отзыв */}
              <div className="mt-6 border-t border-gray-100 pt-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={16} className="text-gray-400" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
                    Отзыв и впечатления
                  </h2>
                </div>

                {book.review ? (
                  <div className="rounded-2xl bg-gray-50/80 p-4 text-xs sm:text-sm font-normal leading-relaxed text-gray-800 whitespace-pre-wrap">
                    {book.review}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-center">
                    <p className="text-xs text-gray-400">Отзыв к этой книге пока не написан.</p>
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        onEdit(book)
                      }}
                      className="mt-2 text-xs font-bold text-gray-900 hover:underline cursor-pointer"
                    >
                      + Написать или наговорить отзыв
                    </button>
                  </div>
                )}
              </div>

              {/* Раздел: Цитаты */}
              {quotesList.length > 0 ? (
                <div className="mt-6 border-t border-gray-100 pt-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Quote size={16} className="text-gray-400" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
                      Любимые цитаты ({quotesList.length})
                    </h2>
                  </div>

                  <div className="space-y-2.5">
                    {quotesList.map((q, idx) => (
                      <div
                        key={idx}
                        className="relative rounded-2xl bg-gray-50/80 p-3.5 pl-4 text-xs font-medium italic text-gray-700 border-l-2 border-gray-900"
                      >
                        «{q.replace(/^[«"]|[»"]$/g, '')}»
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Футер с действиями */}
        <footer className="flex items-center justify-between border-t border-gray-100 px-6 py-4 bg-gray-50/50">
          <button
            type="button"
            onClick={() => {
              onClose()
              onDelete(book.id)
            }}
            className="inline-flex items-center gap-1.5 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:text-red-600 cursor-pointer active:scale-95"
          >
            <Trash2 size={14} />
            <span>Удалить</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose()
                onEdit(book)
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-gray-800 cursor-pointer active:scale-95"
            >
              <Pencil size={13} />
              <span>Редактировать</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
