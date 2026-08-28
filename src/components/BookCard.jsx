import { useEffect, useRef, useState } from 'react'
import { Check, MoreHorizontal, Pencil, Star, Trash2 } from 'lucide-react'
import { STATUS, formatReadPeriod, statusLabel } from '../constants'

function getStatusStyle(status) {
  switch (status) {
    case STATUS.read:
      return 'bg-[#DCFFDF] text-[#15803D]'
    case STATUS.reading:
      return 'bg-[#E0F2FE] text-[#0369A1]'
    case STATUS.abandoned:
      return 'bg-[#FFE5E5] text-[#D32F2F]'
    case STATUS.wantToRead:
      return 'bg-[#F3E8FF] text-[#7C3AED]'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

export function BookCard({
  book,
  menuOpen,
  onToggleMenu,
  onEdit,
  onMarkRead,
  onQuickRate,
  onDelete,
}) {
  const [coverFailed, setCoverFailed] = useState(false)
  const [ratingPicker, setRatingPicker] = useState(false)
  const menuRef = useRef(null)
  const showCover = Boolean(book.coverUrl) && !coverFailed
  const period = formatReadPeriod(book)
  const hasRating = book.rating != null && book.status !== STATUS.wantToRead

  useEffect(() => {
    if (!menuOpen) {
      setRatingPicker(false)
      return undefined
    }
    function onPointer(event) {
      if (!menuRef.current?.contains(event.target)) {
        onToggleMenu(null)
        setRatingPicker(false)
      }
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [menuOpen, onToggleMenu])

  function handleCardClick() {
    onEdit(book)
  }

  return (
    <article
      onClick={handleCardClick}
      className="group relative flex h-[364px] w-full cursor-pointer flex-col justify-between rounded-[25px] bg-white p-[20px] text-[14px] font-normal leading-normal text-[#000] shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:shadow-[0_16px_48px_rgba(0,0,0,0.08)] select-none"
    >
      {/* Меню действий с отступами 12px сверху и справа */}
      <div ref={menuRef} className="absolute top-3 right-3 z-10">
        <button
          type="button"
          aria-label="Действия"
          onClick={(event) => {
            event.stopPropagation()
            setRatingPicker(false)
            onToggleMenu(menuOpen ? null : book.id)
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
        >
          <MoreHorizontal size={18} />
        </button>
        {menuOpen ? (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-9 right-0 w-56 rounded-2xl border border-gray-100 bg-white p-2 shadow-[0_18px_50px_rgba(0,0,0,0.12)] z-20 animate-in fade-in zoom-in-95 duration-100"
          >
            {ratingPicker ? (
              <div className="p-1 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold text-gray-800">Поставить оценку</span>
                  <button
                    type="button"
                    onClick={() => setRatingPicker(false)}
                    className="text-[11px] font-semibold text-gray-400 hover:text-gray-900 cursor-pointer"
                  >
                    « Назад
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                    const isCurrent = book.rating === num
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          onToggleMenu(null)
                          setRatingPicker(false)
                          if (onQuickRate) onQuickRate(book.id, num)
                        }}
                        className={`flex h-8 items-center justify-center rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-gray-900 text-white shadow-xs'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-90'
                        }`}
                      >
                        {num}
                      </button>
                    )
                  })}
                </div>
                {book.rating != null && (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleMenu(null)
                      setRatingPicker(false)
                      if (onQuickRate) onQuickRate(book.id, null)
                    }}
                    className="w-full text-center pt-1 pb-0.5 text-[11px] font-medium text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    Сбросить оценку
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-0.5">
                <MenuItem
                  icon={Pencil}
                  onClick={() => {
                    onToggleMenu(null)
                    onEdit(book)
                  }}
                >
                  Редактировать
                </MenuItem>
                {book.status === STATUS.read && (
                  <MenuItem
                    icon={Star}
                    onClick={() => setRatingPicker(true)}
                  >
                    {book.rating != null ? `Оценка: ${book.rating} ★ (изменить)` : 'Поставить оценку'}
                  </MenuItem>
                )}
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
            )}
          </div>
        ) : null}
      </div>

      {/* Заголовок и автор */}
      <div className="w-full max-w-[210px] pr-4 text-left">
        <h3
          style={{ lineHeight: '110%' }}
          className="line-clamp-2 font-semibold text-gray-900"
        >
          {book.title}
        </h3>
        {book.author ? (
          <p
            style={{ lineHeight: '100%' }}
            className="mt-1 truncate text-gray-400"
          >
            {book.author}
          </p>
        ) : null}
      </div>

      {/* Обложка с эффектом блюра и оценкой по центру при ховере */}
      <div className="my-auto flex justify-center py-1">
        <div className="relative h-[160px] w-[112px] overflow-hidden rounded-[15px] bg-white shadow-[0_4px_20px_0_rgba(0,0,0,0.15)]">
          {showCover ? (
            <img
              src={book.coverUrl}
              alt=""
              className={`h-full w-full object-cover transition-all duration-300 ${
                hasRating ? 'group-hover:scale-105 group-hover:blur-[5px]' : ''
              }`}
              onError={() => setCoverFailed(true)}
            />
          ) : (
            <div
              className={`h-full w-full bg-white transition-all duration-300 ${
                hasRating ? 'group-hover:blur-[5px]' : ''
              }`}
            />
          )}

          {/* Плашка оценки при ховере */}
          {hasRating ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <span className="rounded-full bg-white/95 px-3 py-1 text-[12px] font-semibold text-gray-900 shadow-[0_4px_16px_rgba(0,0,0,0.15)] backdrop-blur-sm">
                {book.rating} / 10
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Нижняя часть карточки */}
      <div className="flex items-end justify-between gap-2">
        <div className="flex min-w-0 max-w-[170px] flex-col items-start gap-1.5">
          <span
            className={`inline-flex items-center rounded-[20px] px-2.5 py-1 text-[12px] font-medium leading-none ${getStatusStyle(book.status)}`}
          >
            {statusLabel(book.status)}
          </span>
          {book.tags?.length ? (
            <div className="flex flex-wrap gap-1">
              {book.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center justify-center rounded-[20px] bg-[#F6F6F6] px-2.5 py-1 text-[12px] font-medium leading-none text-gray-800"
                >
                  {tag}
                </span>
              ))}
              {book.tags.length > 2 ? (
                <span className="inline-flex items-center justify-center rounded-[20px] bg-[#F6F6F6] px-2.5 py-1 text-[12px] font-medium leading-none text-gray-800">
                  +{book.tags.length - 2}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Дата прочтения с отступами по 24px от правого нижнего угла */}
        {period ? (
          <span className="absolute right-6 bottom-6 text-[12px] font-medium leading-none text-gray-400">
            {period}
          </span>
        ) : null}
      </div>
    </article>
  )
}

function MenuItem({ icon: Icon, onClick, danger = false, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold cursor-pointer ${
        danger ? 'text-red-500 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      <Icon size={14} />
      <span>{children}</span>
    </button>
  )
}
