import { useEffect, useRef, useState } from 'react'
import {
  ArrowUpDown,
  BookOpen,
  Check,
  ChevronDown,
  Download,
  Filter,
  LayoutDashboard,
  LayoutGrid,
  List,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
} from 'lucide-react'
import { FORMAT_OPTIONS, SORT_OPTIONS, STATUS_OPTIONS } from '../constants'

export function MobileBottomDock({
  page,
  onNavigate,
  statusFilter,
  onStatusFilter,
  counts,
  onAdd,
  searchQuery,
  setSearchQuery,
  selectedGenre,
  setSelectedGenre,
  availableGenres = [],
  selectedRating,
  setSelectedRating,
  selectedFormat,
  setSelectedFormat,
  sortBy,
  setSortBy,
  resetExtraFilters,
  hasActiveExtraFilters,
  onOpenBackup,
  viewMode = 'list',
  onToggleViewMode,
  globalYear,
  setGlobalYear,
  availableYears = [],
  onOpenYearInReview,
}) {
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [yearMenuOpen, setYearMenuOpen] = useState(false)
  const [toolsSheetOpen, setToolsSheetOpen] = useState(false)

  const statusMenuRef = useRef(null)
  const yearMenuRef = useRef(null)

  // Закрытие выпадающих списков при клике вне их области
  useEffect(() => {
    function onPointerDown(e) {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target)) {
        setStatusMenuOpen(false)
      }
      if (yearMenuRef.current && !yearMenuRef.current.contains(e.target)) {
        setYearMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  // Текущий выбранный статус и его название
  const currentStatusObj = STATUS_OPTIONS.find((s) => s.value === statusFilter)
  const currentLabel = statusFilter === 'all' ? 'Все' : currentStatusObj?.label || 'Все'
  const currentCount = statusFilter === 'all' ? (counts?.all ?? 0) : (counts?.[statusFilter] ?? 0)

  const hasAnyFilterActive = hasActiveExtraFilters || Boolean(searchQuery)

  return (
    <>
      {/* 1. Плавающий нижний док по центру: 2 отдельные белые плашки */}
      <div
        aria-label="Мобильная панель управления"
        className="fixed bottom-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.5rem))] left-0 right-0 z-40 lg:hidden flex items-center justify-center gap-2 px-3 pointer-events-none pb-0.5"
      >
        {/* ПЛАШКА 1: Отдельный переключатель страниц на белом фоне с мягкой круглой тенью */}
        <div className="pointer-events-auto flex items-center rounded-full border border-black/[0.06] bg-white/95 p-1 shadow-[0_4px_24px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.04)] backdrop-blur-md shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('library')}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-all cursor-pointer ${
              page === 'library'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
            title="Библиотека"
            aria-label="Библиотека"
          >
            <BookOpen size={18} strokeWidth={2.2} />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-all cursor-pointer ${
              page === 'dashboard'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
            title="Дашборд"
            aria-label="Дашборд"
          >
            <LayoutDashboard size={18} strokeWidth={2.2} />
          </button>
        </div>

        {/* ПЛАШКА 2: Белая «колбаса», подстраивающаяся по ширине под контент, с мягкой круглой тенью */}
        <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-white/95 p-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.04)] backdrop-blur-md w-auto shrink-0">
          {/* Контролы Библиотеки */}
          {page === 'library' && (
            <>
              {/* Дропдаун статуса под размер текста */}
              <div ref={statusMenuRef} className="relative inline-flex shrink-0">
                <button
                  type="button"
                  onClick={() => setStatusMenuOpen((v) => !v)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-gray-100/90 px-3.5 text-xs font-bold text-gray-900 transition-all hover:bg-gray-200/80 active:scale-98 cursor-pointer whitespace-nowrap"
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      statusFilter === 'read'
                        ? 'bg-[#15803D]'
                        : statusFilter === 'reading'
                          ? 'bg-[#0369A1]'
                          : statusFilter === 'want_to_read'
                            ? 'bg-[#7C3AED]'
                            : statusFilter === 'abandoned'
                              ? 'bg-[#D32F2F]'
                              : 'bg-gray-900'
                    }`}
                  />
                  <span>{currentLabel}</span>
                  <span className="text-gray-400 font-semibold">{currentCount}</span>
                  <ChevronDown size={13} className="text-gray-400 shrink-0 ml-0.5" />
                </button>

                {/* Меню статусов */}
                {statusMenuOpen && (
                  <div className="absolute bottom-13 left-0 min-w-[180px] rounded-2xl border border-gray-100 bg-white p-1.5 shadow-[0_16px_45px_rgba(0,0,0,0.18)] z-50 animate-in fade-in zoom-in-95 duration-150">
                    <button
                      type="button"
                      onClick={() => {
                        onStatusFilter('all')
                        setStatusMenuOpen(false)
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold transition-colors cursor-pointer ${
                        statusFilter === 'all' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>Все</span>
                      <span className={statusFilter === 'all' ? 'text-white/60' : 'text-gray-400'}>
                        {counts?.all ?? 0}
                      </span>
                    </button>

                    {STATUS_OPTIONS.map((opt) => {
                      const active = statusFilter === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            onStatusFilter(opt.value)
                            setStatusMenuOpen(false)
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold transition-colors cursor-pointer ${
                            active ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                opt.value === 'read'
                                  ? 'bg-[#15803D]'
                                  : opt.value === 'reading'
                                    ? 'bg-[#0369A1]'
                                    : opt.value === 'want_to_read'
                                      ? 'bg-[#7C3AED]'
                                      : 'bg-[#D32F2F]'
                              }`}
                            />
                            <span>{opt.label}</span>
                          </div>
                          <span className={active ? 'text-white/60' : 'text-gray-400'}>
                            {counts?.[opt.value] ?? 0}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Кнопка (+) добавления */}
              <button
                type="button"
                aria-label="Добавить книгу"
                onClick={onAdd}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Plus size={20} strokeWidth={2.5} />
              </button>

              {/* Кнопка (🎛️) фильтров и настроек */}
              <button
                type="button"
                aria-label="Настройки и фильтры"
                onClick={() => setToolsSheetOpen(true)}
                className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all active:scale-95 cursor-pointer ${
                  hasAnyFilterActive || toolsSheetOpen
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <SlidersHorizontal size={17} strokeWidth={2} />
                {hasAnyFilterActive && (
                  <span className="absolute top-1 right-1 flex h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                )}
              </button>
            </>
          )}

          {/* Контролы Дашборда */}
          {page === 'dashboard' && (
            <>
              {/* Дропдаун года под размер текста */}
              <div ref={yearMenuRef} className="relative inline-flex shrink-0">
                <button
                  type="button"
                  onClick={() => setYearMenuOpen((v) => !v)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-gray-100/90 px-3.5 text-xs font-bold text-gray-900 transition-all hover:bg-gray-200/80 active:scale-98 cursor-pointer whitespace-nowrap"
                >
                  <span>
                    {globalYear === 'all' ? 'Все годы' : `${globalYear} год`}
                  </span>
                  <ChevronDown size={13} className="text-gray-400 shrink-0 ml-0.5" />
                </button>

                {/* Меню годов */}
                {yearMenuOpen && (
                  <div className="absolute bottom-13 left-0 min-w-[150px] rounded-2xl border border-gray-100 bg-white p-1.5 shadow-[0_16px_45px_rgba(0,0,0,0.18)] z-50 animate-in fade-in zoom-in-95 duration-150">
                    <button
                      type="button"
                      onClick={() => {
                        if (setGlobalYear) setGlobalYear('all')
                        setYearMenuOpen(false)
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold transition-colors cursor-pointer ${
                        globalYear === 'all' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>Все годы</span>
                    </button>

                    {availableYears.map((year) => {
                      const active = globalYear === year
                      return (
                        <button
                          key={year}
                          type="button"
                          onClick={() => {
                            if (setGlobalYear) setGlobalYear(year)
                            setYearMenuOpen(false)
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold transition-colors cursor-pointer ${
                            active ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span>{year} год</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Кнопка «Итоги года» */}
              {globalYear !== 'all' && onOpenYearInReview && (
                <button
                  type="button"
                  onClick={onOpenYearInReview}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-gray-900 px-3.5 text-xs font-bold text-white shadow-xs transition-all active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <Sparkles size={14} className="text-white" />
                  <span>Итоги</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 2. Нижняя шторка (Bottom Sheet) со всеми инструментами */}
      {toolsSheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-xs transition-opacity lg:hidden"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setToolsSheetOpen(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-h-[85vh] overflow-y-auto rounded-t-[32px] bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.22)] animate-in slide-in-from-bottom duration-200"
          >
            {/* Ручка шторки */}
            <div className="mx-auto -mt-2 mb-4 h-1 w-10 rounded-full bg-gray-300" />

            {/* Шапка шторки */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-gray-900" />
                <h3 className="text-base font-extrabold text-gray-900">Управление и фильтры</h3>
              </div>
              <button
                type="button"
                onClick={() => setToolsSheetOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-5">
              {/* Поиск по каталогу */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Поиск по каталогу
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery || ''}
                    onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
                    placeholder="Название, автор, тег или цитата…"
                    className="w-full h-11 rounded-2xl border border-gray-200 bg-gray-50/80 px-3.5 pl-10 text-sm font-medium text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-900 focus:bg-white"
                  />
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery && setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-gray-500 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Вид отображения (Список / Сетка) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Вид отображения
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleViewMode && onToggleViewMode('list')}
                    className={`flex h-11 items-center justify-center gap-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      viewMode === 'list'
                        ? 'bg-gray-900 text-white shadow-xs'
                        : 'border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <List size={16} />
                    <span>Списком</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleViewMode && onToggleViewMode('grid')}
                    className={`flex h-11 items-center justify-center gap-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-gray-900 text-white shadow-xs'
                        : 'border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <LayoutGrid size={16} />
                    <span>Карточками</span>
                  </button>
                </div>
              </div>

              {/* Сортировка */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Сортировка
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {SORT_OPTIONS.map((opt) => {
                    const isSelected = sortBy === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSortBy && setSortBy(opt.value)}
                        className={`flex h-10 items-center justify-between rounded-xl px-3.5 text-left text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-gray-900 text-white shadow-xs font-bold'
                            : 'border border-gray-100 bg-gray-50/70 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSelected ? <Check size={14} className="text-white" /> : null}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Фильтры: Жанр */}
              {availableGenres.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Жанр книги
                  </label>
                  <div className="relative">
                    <select
                      value={selectedGenre}
                      onChange={(e) => setSelectedGenre && setSelectedGenre(e.target.value)}
                      className="w-full appearance-none rounded-2xl border border-gray-200 bg-gray-50/80 py-2.5 pl-3.5 pr-9 text-xs font-bold text-gray-900 outline-none cursor-pointer focus:border-gray-900 focus:bg-white"
                    >
                      <option value="all">Все жанры</option>
                      {availableGenres.map((g) => (
                        <option key={g.name} value={g.name}>
                          {g.name} ({g.count})
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                  </div>
                </div>
              )}

              {/* Фильтры: Оценка */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Оценка книги
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { value: 'all', label: 'Все' },
                    { value: '10', label: '★ 10' },
                    { value: '9+', label: '★ 9+' },
                    { value: '8+', label: '★ 8+' },
                    { value: '7+', label: '★ 7+' },
                    { value: 'unrated', label: 'Без оценки' },
                  ].map((r) => {
                    const isSelected = selectedRating === r.value
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setSelectedRating && setSelectedRating(r.value)}
                        className={`flex h-9 items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-gray-900 text-white shadow-xs'
                            : 'border border-gray-100 bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {r.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Фильтры: Формат */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Формат книги
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { value: 'all', label: 'Все' },
                    ...FORMAT_OPTIONS,
                  ].map((f) => {
                    const isSelected = selectedFormat === f.value
                    return (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => setSelectedFormat && setSelectedFormat(f.value)}
                        className={`flex h-9 items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-gray-900 text-white shadow-xs'
                            : 'border border-gray-100 bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {f.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Кнопки действий: Сброс и Бэкап */}
              <div className="pt-2 flex items-center gap-2 border-t border-gray-100">
                {hasActiveExtraFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      if (resetExtraFilters) resetExtraFilters()
                      if (setSearchQuery) setSearchQuery('')
                    }}
                    className="flex-1 flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-gray-100 text-xs font-bold text-gray-700 hover:bg-gray-200 transition-all cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    <span>Сбросить всё</span>
                  </button>
                )}

                {onOpenBackup && (
                  <button
                    type="button"
                    onClick={() => {
                      setToolsSheetOpen(false)
                      onOpenBackup()
                    }}
                    className="flex-1 flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-gray-200 bg-white text-xs font-bold text-gray-800 hover:bg-gray-50 transition-all cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Резервная копия</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
