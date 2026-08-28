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
  const menuRef = useRef(null)
  const showCover = Boolean(book.coverUrl) && !coverFailed
  const period = formatReadPeriod(book)
  const hasRating = book.rating != null && book.status !== STATUS.wantToRead

  useEffect(() => {
    if (!menuOpen) return undefined
    function onPointer(event) {
      if (!menuRef.current?.contains(event.target)) {
        onToggleMenu(null)
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
      className="group relative flex w-full cursor-pointer flex-row sm:flex-col justify-between items-center sm:items-stretch rounded-[22px] sm:rounded-[25px] bg-white p-3.5 sm:p-[20px] text-[14px] font-normal leading-normal text-[#000] shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:shadow-[0_16px_48px_rgba(0,0,0,0.08)] select-none sm:h-[364px] gap-3.5 sm:gap-0"
    >
      {/* Меню действий */}
      <div ref={menuRef} className="absolute top-2.5 sm:top-3 right-2.5 sm:right-3 z-10">
        <button
          type="button"
          aria-label="Действия"
          onClick={(event) => {
            event.stopPropagation()
            onToggleMenu(menuOpen ? null : book.id)
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
        >
          <MoreHorizontal size={18} />
        </button>
        {menuOpen ? (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-9 right-0 w-60 rounded-2xl border border-gray-100 bg-white p-2 shadow-[0_20px_55px_rgba(0,0,0,0.14)] z-30 animate-in fade-in zoom-in-95 duration-100"
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
                <div className="my-1.5 rounded-xl bg-gray-50/90 p-2.5 border border-gray-100">
                  <div className="flex items-center justify-between mb-2 px-0.5">
                    <span className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                      <Star size={12} className={book.rating ? 'fill-gray-900 text-gray-900' : 'text-gray-400'} />
                      <span>Оценка</span>
                    </span>
                    {book.rating != null ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-extrabold text-gray-900">{book.rating} / 10</span>
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
                      <span className="text-[10px] text-gray-400 font-medium">Без оценки</span>
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
                          className={`flex h-6 items-center justify-center rounded-md text-[11px] font-bold transition-all cursor-pointer ${
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
        ) : null}
      </div>

      {/* --- МОБИЛЬНЫЙ ВИД (SM:HIDDEN) --- */}
      {/* 1. Обложка слева без тяжелой тени */}
      <div className="sm:hidden relative w-[80px] h-[116px] shrink-0 overflow-hidden rounded-[16px] bg-gray-100">
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

      {/* 2. Текстовая информация справа */}
      <div className="sm:hidden min-w-0 flex-1 flex flex-col justify-between self-stretch pr-6">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center rounded-[20px] px-2 py-0.5 text-[11px] font-medium leading-none ${getStatusStyle(book.status)}`}
            >
              {statusLabel(book.status)}
            </span>
            {hasRating ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-bold text-white">
                <Star size={9} className="fill-white text-white" />
                <span>{book.rating}</span>
              </span>
            ) : null}
          </div>

          <h4 className="mt-1 font-extrabold text-[15px] leading-snug text-gray-900 line-clamp-2">
            {book.title}
          </h4>
          <p className="text-xs font-semibold text-gray-500 truncate mt-0.5">
            {book.author || 'Автор не указан'}
          </p>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {book.pages ? (
            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
              {book.pages} стр.
            </span>
          ) : null}
          {book.tags?.slice(0, 1).map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-[#F6F6F6] px-2 py-0.5 text-[10px] font-semibold text-gray-700 truncate max-w-[110px]"
            >
              {tag.replace(/^#/, '')}
            </span>
          ))}
          {period ? (
            <span className="text-[11px] font-medium text-gray-400 ml-auto">
              {period}
            </span>
          ) : null}
        </div>
      </div>

      {/* --- ДЕСКТОПНЫЙ ВИД (HIDDEN SM:FLEX) --- */}
      {/* Верхняя часть: Название и автор */}
      <div className="hidden sm:flex flex-col items-start pr-6">
        <h3 className="w-full truncate text-[16px] font-bold leading-tight text-gray-900">
          {book.title}
        </h3>
        <p className="mt-1 w-full truncate text-[14px] font-medium text-gray-400">
          {book.author || 'Автор не указан'}
        </p>
      </div>

      {/* Обложка с эффектом блюра и оценкой по центру при ховере */}
      <div className="hidden sm:flex my-auto justify-center py-1">
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

      {/* Нижняя часть карточки на десктопе */}
      <div className="hidden sm:flex items-end justify-between gap-2">
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
                  {tag.replace(/^#/, '')}
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

        {/* Дата прочтения */}
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
