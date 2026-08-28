import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  Download,
  LayoutGrid,
  Library as LibraryIcon,
  List,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { FORMAT_OPTIONS, SORT_OPTIONS, STATUS_OPTIONS } from '../constants'
import { BackupModal } from './BackupModal'
import { BookCard } from './BookCard'
import { MobileBottomDock } from './MobileBottomDock'

const COLLATOR = new Intl.Collator('ru')

function readDateKey(book) {
  const year = Number(book.readYear)
  const month = Number(book.readMonth)
  if (!year || !month) return null
  return year * 100 + month
}

function byReadDateDesc(a, b) {
  const ka = readDateKey(a) ?? Number.POSITIVE_INFINITY
  const kb = readDateKey(b) ?? Number.POSITIVE_INFINITY
  if (ka === kb) return 0
  return kb - ka
}

function byReadDateAsc(a, b) {
  const ka = readDateKey(a) ?? Number.POSITIVE_INFINITY
  const kb = readDateKey(b) ?? Number.POSITIVE_INFINITY
  if (ka === kb) return 0
  return ka - kb
}

function getComparator(sortBy) {
  switch (sortBy) {
    case 'oldest':
      return byReadDateAsc
    case 'author':
      return (a, b) => COLLATOR.compare(a.author ?? '', b.author ?? '')
    case 'title':
      return (a, b) => COLLATOR.compare(a.title ?? '', b.title ?? '')
    case 'rating':
      return (a, b) => (b.rating ?? 0) - (a.rating ?? 0)
    case 'newest':
    default:
      return byReadDateDesc
  }
}

export function Library({
  books,
  statusFilter,
  onStatusFilter,
  onEdit,
  onMarkRead,
  onQuickRate,
  onDelete,
  onAdd,
  onImportBooks,
  page = 'library',
  onNavigate,
}) {
  const [menuId, setMenuId] = useState(null)
  const [viewMode, setViewMode] = useState('list')
  const [sortBy, setSortBy] = useState('newest')
  const [sortOpen, setSortOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('all')
  const [selectedRating, setSelectedRating] = useState('all')
  const [selectedFormat, setSelectedFormat] = useState('all')
  const [backupOpen, setBackupOpen] = useState(false)

  const sortRef = useRef(null)
  const filterRef = useRef(null)

  useEffect(() => {
    function onPointerDown(event) {
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setSortOpen(false)
      }
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  // Книги, подходящие под текущий статус (для подсчета доступных жанров)
  const statusScopedBooks = useMemo(() => {
    return statusFilter === 'all' ? books : books.filter((b) => b.status === statusFilter)
  }, [books, statusFilter])

  // Список доступных жанров с количеством книг
  const availableGenres = useMemo(() => {
    const map = new Map()
    statusScopedBooks.forEach((book) => {
      book.tags?.forEach((tag) => {
        if (!tag) return
        map.set(tag, (map.get(tag) || 0) + 1)
      })
    })
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ru'))
  }, [statusScopedBooks])

  // Фильтрация
  const visible = useMemo(() => {
    let filtered = statusScopedBooks

    // 1. Фильтр по жанру
    if (selectedGenre !== 'all') {
      filtered = filtered.filter((b) => (b.tags || []).includes(selectedGenre))
    }

    // 2. Фильтр по рейтингу
    if (selectedRating !== 'all') {
      if (selectedRating === 'unrated') {
        filtered = filtered.filter((b) => b.rating == null || b.rating === '')
      } else if (selectedRating === '10') {
        filtered = filtered.filter((b) => Number(b.rating) === 10)
      } else if (selectedRating === '9+') {
        filtered = filtered.filter((b) => Number(b.rating) >= 9)
      } else if (selectedRating === '8+') {
        filtered = filtered.filter((b) => Number(b.rating) >= 8)
      } else if (selectedRating === '7+') {
        filtered = filtered.filter((b) => Number(b.rating) >= 7)
      }
    }

    // 3. Фильтр по формату
    if (selectedFormat !== 'all') {
      filtered = filtered.filter((b) => b.format === selectedFormat)
    }

    // 4. Поиск
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      filtered = filtered.filter((b) => {
        const matchTitle = (b.title || '').toLowerCase().includes(q)
        const matchAuthor = (b.author || '').toLowerCase().includes(q)
        const matchTags = (b.tags || []).some((t) => t.toLowerCase().includes(q))
        const matchReview = (b.review || '').toLowerCase().includes(q)
        const matchQuotes = (b.quotes || '').toLowerCase().includes(q)
        return matchTitle || matchAuthor || matchTags || matchReview || matchQuotes
      })
    }

    return [...filtered].sort(getComparator(sortBy))
  }, [statusScopedBooks, sortBy, searchQuery, selectedGenre, selectedRating, selectedFormat])

  const counts = useMemo(() => {
    const result = { all: books.length }
    for (const option of STATUS_OPTIONS) {
      result[option.value] = books.filter((book) => book.status === option.value).length
    }
    return result
  }, [books])

  const hasActiveExtraFilters =
    selectedGenre !== 'all' || selectedRating !== 'all' || selectedFormat !== 'all'

  const activeExtraFiltersCount =
    (selectedGenre !== 'all' ? 1 : 0) +
    (selectedRating !== 'all' ? 1 : 0) +
    (selectedFormat !== 'all' ? 1 : 0)

  function resetExtraFilters() {
    setSelectedGenre('all')
    setSelectedRating('all')
    setSelectedFormat('all')
  }

  function resetAll() {
    resetExtraFilters()
    setSearchQuery('')
  }

  return (
    <div>
      <header className="relative z-40">
        {/* Заголовок Библиотека: компактный на мобильных, с отступами на десктопе */}
        <h1 className="pt-4 pb-3 md:pt-[120px] md:pb-[80px] text-center text-4xl font-extrabold tracking-tight text-gray-900 sm:text-6xl md:text-[64px]">
          Библиотека
        </h1>

        {/* Единая контрольная строка (Frame 45): Только на десктопе (lg:flex), на мобильных вынесена в нижний док */}
        <div className="hidden lg:flex flex-row items-center justify-between gap-4">
          {/* Левая часть: плашки статусов с достаточным вертикальным клиренсом для теней ховера */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-3.5 -my-3.5 px-1 -mx-1">
            <FilterChip
              active={statusFilter === 'all'}
              onClick={() => onStatusFilter('all')}
              label="Все"
              count={counts.all}
            />
            {STATUS_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                active={statusFilter === option.value}
                onClick={() => onStatusFilter(option.value)}
                label={option.label}
                count={counts[option.value]}
              />
            ))}
          </div>

          {/* Правая часть: Компактный поиск + 3 круглые кнопки (Фильтры, Скачать, Сортировка) */}
          <div className="flex items-center justify-end gap-2 shrink-0">
            {/* Поле поиска */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск"
                className="h-12 w-40 sm:w-52 rounded-full border border-gray-100/90 bg-white px-4 text-[14px] font-medium text-gray-900 placeholder:text-gray-400 outline-none transition-colors hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] focus:border-gray-900"
              />
              {searchQuery ? (
                <button
                  type="button"
                  aria-label="Очистить поиск"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  <X size={12} />
                </button>
              ) : null}
            </div>

            {/* 1. Кнопка «Фильтры» (Жанры, Рейтинг, Формат) */}
            <div ref={filterRef} className="relative">
              <button
                type="button"
                aria-label="Фильтры"
                aria-expanded={filterOpen}
                onClick={() => {
                  setFilterOpen((val) => !val)
                  setSortOpen(false)
                }}
                className={`relative flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
                  hasActiveExtraFilters || filterOpen
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-700 hover:text-gray-900 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]'
                }`}
              >
                <SlidersHorizontal size={18} strokeWidth={2} />
                {hasActiveExtraFilters ? (
                  <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-extrabold text-white shadow-xs">
                    {activeExtraFiltersCount}
                  </span>
                ) : null}
              </button>

              {/* Выпадающее окно фильтров */}
              {filterOpen ? (
                <div className="absolute right-0 top-14 z-50 w-72 rounded-[24px] border border-gray-100 bg-white p-4 shadow-[0_24px_60px_rgba(0,0,0,0.16)] animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-gray-900">
                      Фильтры
                    </span>
                    {hasActiveExtraFilters ? (
                      <button
                        type="button"
                        onClick={resetExtraFilters}
                        className="text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
                      >
                        Сбросить
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-3.5 space-y-3.5">
                    {/* Фильтр: Жанр */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                        Жанр книги
                      </label>
                      <div className="relative">
                        <select
                          value={selectedGenre}
                          onChange={(e) => setSelectedGenre(e.target.value)}
                          className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-gray-800 outline-none cursor-pointer focus:border-gray-900"
                        >
                          <option value="all">Все жанры ({statusScopedBooks.length})</option>
                          {availableGenres.map((g) => (
                            <option key={g.name} value={g.name}>
                              {g.name} ({g.count})
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={13}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                      </div>
                    </div>

                    {/* Фильтр: Оценка */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                        Оценка читателя
                      </label>
                      <div className="relative">
                        <select
                          value={selectedRating}
                          onChange={(e) => setSelectedRating(e.target.value)}
                          className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-gray-800 outline-none cursor-pointer focus:border-gray-900"
                        >
                          <option value="all">Любая оценка</option>
                          <option value="10">10 ★ (Шедевр)</option>
                          <option value="9+">9+ ★ (Отлично)</option>
                          <option value="8+">8+ ★ (Очень хорошо)</option>
                          <option value="7+">7+ ★ (Хорошо)</option>
                          <option value="unrated">Без оценки</option>
                        </select>
                        <ChevronDown
                          size={13}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                      </div>
                    </div>

                    {/* Фильтр: Формат */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                        Формат
                      </label>
                      <div className="relative">
                        <select
                          value={selectedFormat}
                          onChange={(e) => setSelectedFormat(e.target.value)}
                          className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-gray-800 outline-none cursor-pointer focus:border-gray-900"
                        >
                          <option value="all">Все форматы</option>
                          <option value="paper">Бумага</option>
                          <option value="audio">Аудио</option>
                          <option value="ebook">Электронная</option>
                        </select>
                        <ChevronDown
                          size={13}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* 2. Кнопка «Скачать / Бэкап» */}
            <button
              type="button"
              aria-label="Резервная копия и экспорт"
              title="Резервная копия и экспорт"
              onClick={() => {
                setBackupOpen(true)
                setFilterOpen(false)
                setSortOpen(false)
              }}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-700 transition-all duration-200 hover:scale-105 hover:text-gray-900 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] active:scale-95 cursor-pointer"
            >
              <Download size={18} strokeWidth={2} />
            </button>

            {/* 3. Кнопка «Сортировка» */}
            <div ref={sortRef} className="relative">
              <button
                type="button"
                aria-label="Сортировка"
                aria-expanded={sortOpen}
                onClick={() => {
                  setSortOpen((val) => !val)
                  setFilterOpen(false)
                }}
                className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
                  sortOpen
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-700 hover:text-gray-900 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]'
                }`}
              >
                <ArrowUpDown size={18} strokeWidth={2} />
              </button>

              {/* Меню сортировки */}
              {sortOpen ? (
                <div className="absolute right-0 top-14 z-50 w-60 rounded-2xl border border-gray-100 bg-white p-2 shadow-[0_20px_50px_rgba(0,0,0,0.14)] animate-in fade-in zoom-in-95 duration-150">
                  <p className="px-3 py-1.5 text-xs font-semibold text-gray-400">
                    Сортировка каталога
                  </p>
                  <div className="mt-1 space-y-1">
                    {SORT_OPTIONS.map((option) => {
                      const isSelected = sortBy === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setSortBy(option.value)
                            setSortOpen(false)
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all cursor-pointer ${
                            isSelected
                              ? 'border border-gray-200/80 bg-gray-50 text-gray-900 font-semibold shadow-xs'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <span>{option.label}</span>
                          {isSelected ? <Check size={16} className="text-gray-900" /> : null}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            {/* 4. Переключатель вида (Список / Сетка) на десктопе */}
            <button
              type="button"
              aria-label={viewMode === 'list' ? 'Вид карточками' : 'Вид списком'}
              title={viewMode === 'list' ? 'Переключить на сетку' : 'Переключить на список'}
              onClick={() => setViewMode((v) => (v === 'list' ? 'grid' : 'list'))}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-700 transition-all duration-200 hover:scale-105 hover:text-gray-900 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] active:scale-95 cursor-pointer"
            >
              {viewMode === 'list' ? <LayoutGrid size={18} strokeWidth={2} /> : <List size={18} strokeWidth={2} />}
            </button>
          </div>
        </div>
      </header>

      {/* Сетка карточек */}
      <div className="mt-5">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white px-6 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
              <LibraryIcon size={26} strokeWidth={1.5} />
            </div>
            <p className="mt-4 text-base font-semibold tracking-tight text-gray-900">
              {hasActiveExtraFilters || searchQuery
                ? 'По выбранным условиям ничего не найдено'
                : 'Здесь пока пусто'}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {hasActiveExtraFilters || searchQuery
                ? 'Попробуйте смягчить фильтры или изменить поисковый запрос'
                : 'Добавьте книгу, чтобы начать'}
            </p>
            {hasActiveExtraFilters || searchQuery ? (
              <button
                type="button"
                onClick={resetAll}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-4 py-2 text-xs font-bold text-white hover:bg-gray-800 cursor-pointer"
              >
                <RotateCcw size={12} />
                Сбросить все фильтры
              </button>
            ) : (
              <button
                type="button"
                onClick={onAdd}
                className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 cursor-pointer"
              >
                <Plus size={16} />
                Добавить книгу
              </button>
            )}
          </div>
        ) : viewMode === 'list' ? (
          <div className="flex flex-col gap-1">
            {visible.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                menuOpen={menuId === book.id}
                onToggleMenu={setMenuId}
                onEdit={onEdit}
                onMarkRead={onMarkRead}
                onQuickRate={onQuickRate}
                onDelete={onDelete}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1 md:grid-cols-3 xl:grid-cols-4">
            {visible.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                menuOpen={menuId === book.id}
                onToggleMenu={setMenuId}
                onEdit={onEdit}
                onMarkRead={onMarkRead}
                onQuickRate={onQuickRate}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Мобильный нижний док со статусами, кнопкой (+) и настройками */}
      <MobileBottomDock
        page={page}
        onNavigate={onNavigate}
        statusFilter={statusFilter}
        onStatusFilter={onStatusFilter}
        counts={counts}
        onAdd={onAdd}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedGenre={selectedGenre}
        setSelectedGenre={setSelectedGenre}
        availableGenres={availableGenres}
        selectedRating={selectedRating}
        setSelectedRating={setSelectedRating}
        selectedFormat={selectedFormat}
        setSelectedFormat={setSelectedFormat}
        sortBy={sortBy}
        setSortBy={setSortBy}
        resetExtraFilters={resetExtraFilters}
        hasActiveExtraFilters={hasActiveExtraFilters}
        onOpenBackup={() => setBackupOpen(true)}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
      />

      {/* Модальное окно резервного копирования и экспорта */}
      {backupOpen ? (
        <BackupModal
          books={books}
          onImportBooks={(newBooks) => {
            if (onImportBooks) {
              onImportBooks(newBooks)
            }
          }}
          onClose={() => setBackupOpen(false)}
        />
      ) : null}
    </div>
  )
}

function FilterChip({ active, onClick, label, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center shrink-0 rounded-full px-5 py-2.5 text-[14px] font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer ${
        active
          ? 'bg-gray-900 text-white'
          : 'bg-white text-gray-900 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]'
      }`}
    >
      <span>{label}</span>
      <span className={`mx-1.5 font-bold ${active ? 'text-white/40' : 'text-gray-300'}`}>·</span>
      <span className={`font-semibold ${active ? 'text-white/70' : 'text-gray-400'}`}>
        {count}
      </span>
    </button>
  )
}
