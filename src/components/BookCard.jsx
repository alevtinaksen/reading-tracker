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
  viewMode = 'grid',
}) {
  const [coverFailed, setCoverFailed] = useState(false)
  const menuRef = useRef(null)
  const showCover = Boolean(book.coverUrl) && !coverFailed
  const period = formatReadPeriod(book)
  const hasRating = book.rating != null && book.status !== STATUS.wantToRead

  useEffect(() => {
    if (!menuOpen) return undefined
    function onPointer(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onToggleMenu(null)
      }
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [menuOpen, onToggleMenu])

  function handleCardClick() {
    onEdit(book)
  }

  // Общее выпадающее меню действий
  const actionMenu = menuOpen ? (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute top-8 right-0 w-56 rounded-2xl border border-gray-100 bg-white p-2 shadow-[0_20px_55px_rgba(0,0,0,0.18)] z-50 animate-in fade-in zoom-in-95 duration-100"
    >
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
          <div className="my-1.5 rounded-xl bg-gray-50/90 p-2 border border-gray-100">
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <span className="text-[10px] font-bold text-gray-800 flex items-center gap-1">
                <Star
                  size={11}
                  className={book.rating ? 'fill-gray-900 text-gray-900' : 'text-gray-400'}
                />
                <span>Оценка</span>
              </span>
              {book.rating != null ? (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-extrabold text-gray-900">{book.rating} / 10</span>
                  <button
                    type="button"
                    onClick={() => {
                      onToggleMenu(null)
                      if (onQuickRate) onQuickRate(book.id, null)
                    }}
                    className="text-[10px] text-gray-400 hover:text-red-500 font-bold cursor-pointer ml-1"
                    title="Сбросить оценку"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <span className="text-[10px] text-gray-400">Без оценки</span>
              )}
            </div>
            <div className="grid grid-cols-5 gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                const isSelected = book.rating === num
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      onToggleMenu(null)
                      if (onQuickRate) onQuickRate(book.id, num)
                    }}
                    className={`flex h-5.5 items-center justify-center rounded text-[10px] font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gray-900 text-white shadow-xs'
                        : 'bg-white text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {num}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {book.status !== STATUS.read && (
          <MenuItem
            icon={Check}
            onClick={() => {
              onToggleMenu(null)
              onMarkRead(book.id)
            }}
          >
            Отметить прочитанной
          </MenuItem>
        )}

        <MenuItem
          icon={Trash2}
          danger
          onClick={() => {
            onToggleMenu(null)
            onDelete(book.id)
          }}
        >
          Удалить книгу
        </MenuItem>
      </div>
    </div>
  ) : null

  // 1. РЕЖИМ «СПИСКОМ» (HORIZONTAL ROW CARD)
  if (viewMode === 'list') {
    return (
      <article
        onClick={handleCardClick}
        className="group relative flex w-full cursor-pointer flex-row items-center rounded-[20px] bg-white p-3 text-[14px] font-normal leading-normal text-[#000] transition-all duration-200 select-none gap-3 hover:bg-gray-50/80"
      >
        {/* Обложка слева */}
        <div className="relative w-[70px] h-[102px] sm:w-[76px] sm:h-[110px] shrink-0 overflow-hidden rounded-[14px] bg-gray-100">
          {showCover ? (
            <img
              src={book.coverUrl}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setCoverFailed(true)}
            />
          ) : (
            <div className="h-full w-full bg-gray-100 flex items-center justify-center text-gray-300">
              <span className="text-xl font-bold">📖</span>
            </div>
          )}
        </div>

        {/* Текстовая информация */}
        <div className="min-w-0 flex-1 flex flex-col justify-between self-stretch py-0.5">
          {/* Верхняя строка: статус + дата + меню */}
          <div className="flex items-center justify-between gap-1">
            <span
              className={`inline-flex items-center rounded-[20px] px-2.5 py-0.5 text-[11px] font-medium leading-none ${getStatusStyle(book.status)}`}
            >
              {statusLabel(book.status)}
            </span>

            <div className="flex items-center gap-1 shrink-0">
              {period ? (
                <span className="text-[11px] font-medium text-gray-400 mr-1">{period}</span>
              ) : null}
              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  aria-label="Действия"
                  onClick={(event) => {
                    event.stopPropagation()
                    onToggleMenu(menuOpen ? null : book.id)
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
                >
                  <MoreHorizontal size={16} />
                </button>
                {actionMenu}
              </div>
            </div>
          </div>

          {/* Название и автор снизу */}
          <div className="mt-1">
            <h4 className="font-extrabold text-[14px] sm:text-[15px] leading-snug text-gray-900 line-clamp-2">
              {book.title}
            </h4>
            <p className="text-xs font-semibold text-gray-500 truncate mt-0.5">
              {book.author || 'Автор не указан'}
            </p>
          </div>
        </div>
      </article>
    )
  }

  // 2. РЕЖИМ «КАРТОЧКАМИ / СЕТКОЙ» (VERTICAL GRID CARD)
  return (
    <article
      onClick={handleCardClick}
      className="group relative flex w-full cursor-pointer flex-col justify-between items-stretch rounded-[22px] sm:rounded-[25px] bg-white p-3.5 sm:p-[20px] text-[14px] font-normal leading-normal text-[#000] transition-all duration-200 select-none h-[290px] sm:h-[340px]"
    >
      {/* Верхняя часть: Статус + Меню действий */}
      <div className="flex items-center justify-between gap-1">
        <span
          className={`inline-flex items-center rounded-[20px] px-2.5 py-0.5 text-[11px] font-medium leading-none ${getStatusStyle(book.status)}`}
        >
          {statusLabel(book.status)}
        </span>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-label="Действия"
            onClick={(event) => {
              event.stopPropagation()
              onToggleMenu(menuOpen ? null : book.id)
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
          >
            <MoreHorizontal size={16} />
          </button>
          {actionMenu}
        </div>
      </div>

      {/* Обложка по центру */}
      <div className="my-auto flex justify-center py-1">
        <div className="relative h-[135px] w-[92px] sm:h-[160px] sm:w-[112px] overflow-hidden rounded-[13px] sm:rounded-[15px] bg-white shadow-[0_4px_20px_0_rgba(0,0,0,0.10)]">
          {showCover ? (
            <img
              src={book.coverUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setCoverFailed(true)}
            />
          ) : (
            <div className="h-full w-full bg-gray-50 flex items-center justify-center text-gray-300">
              <span className="text-xl">📖</span>
            </div>
          )}
        </div>
      </div>

      {/* Нижняя часть: Название и автор */}
      <div className="flex flex-col items-start pt-1">
        <h3 className="w-full truncate text-[14px] sm:text-[16px] font-bold leading-tight text-gray-900">
          {book.title}
        </h3>
        <p className="mt-0.5 w-full truncate text-[12px] sm:text-[14px] font-medium text-gray-400">
          {book.author || 'Автор не указан'}
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
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold cursor-pointer ${
        danger ? 'text-red-500 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      <Icon size={14} />
      <span>{children}</span>
    </button>
  )
}
