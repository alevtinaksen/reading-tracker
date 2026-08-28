import { useEffect, useRef, useState } from 'react'
import {
  BookOpen,
  ChevronDown,
  Download,
  LayoutDashboard,
  LayoutGrid,
  List,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
  Plus
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
  availableGenres,
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

  // Закрытие выпадающих списков при клике снаружи
  useEffect(() => {
    function onPointerDown(event) {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target)) {
        setStatusMenuOpen(false)
      }
      if (yearMenuRef.current && !yearMenuRef.current.contains(event.target)) {
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
      {/* 1. Увеличенный плавающий нижний док (крупные удобные кнопки) */}
      <nav
        aria-label="Мобильная панель управления"
        className="fixed bottom-4 left-3 right-3 z-40 lg:hidden flex items-center justify-between gap-2 rounded-full border border-gray-100/90 bg-white/95 p-1.5 shadow-[0_16px_45px_rgba(0,0,0,0.15)] backdrop-blur-md"
      >
        {/* Переключатель страниц: только иконки */}
        <div className="flex items-center rounded-full bg-gray-100 p-1 shrink-0">
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

        {/* --- КОНТРОЛЫ РАЗДЕЛА «БИБЛИОТЕКА» --- */}
        {page === 'library' && (
          <>
            {/* Выпадающий список статусов */}
            <div ref={statusMenuRef} className="relative flex-1 min-w-0">
              <button
                type="button"
                onClick={() => setStatusMenuOpen((v) => !v)}
                className="w-full flex h-10 items-center justify-between gap-1 rounded-full bg-gray-100/90 px-3 text-xs font-bold text-gray-900 transition-all hover:bg-gray-200/80 active:scale-98 cursor-pointer"
              >
                <div className="flex items-center gap-1.5 min-w-0 truncate">
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
                  <span className="truncate">{currentLabel}</span>
                  <span className="text-gray-400 font-semibold">· {currentCount}</span>
                </div>
                <ChevronDown size={14} className="text-gray-400 shrink-0" />
              </button>

              {/* Меню статусов */}
              {statusMenuOpen && (
                <div className="absolute bottom-13 left-0 w-52 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-[0_16px_45px_rgba(0,0,0,0.18)] z-50 animate-in fade-in zoom-in-95 duration-150">
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

        {/* --- КОНТРОЛЫ РАЗДЕЛА «ДАШБОРД» --- */}
        {page === 'dashboard' && (
          <>
            {/* Выпадающий список годов */}
            <div ref={yearMenuRef} className="relative flex-1 min-w-0">
              <button
                type="button"
                onClick={() => setYearMenuOpen((v) => !v)}
                className="w-full flex h-10 items-center justify-between gap-1 rounded-full bg-gray-100/90 px-3 text-xs font-bold text-gray-900 transition-all hover:bg-gray-200/80 active:scale-98 cursor-pointer"
              >
                <span className="truncate">
                  {globalYear === 'all' ? 'Все годы' : `${globalYear} год`}
                </span>
                <ChevronDown size={14} className="text-gray-400 shrink-0" />
              </button>

              {/* Меню годов */}
              {yearMenuOpen && (
                <div className="absolute bottom-13 left-0 w-48 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-[0_16px_45px_rgba(0,0,0,0.18)] z-50 animate-in fade-in zoom-in-95 duration-150">
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

            {/* Кнопка «Итоги года» в дашборде (если выбран конкретный год) */}
            {globalYear !== 'all' && onOpenYearInReview && (
              <button
                type="button"
                onClick={onOpenYearInReview}
                className="flex h-10 items-center gap-1.5 rounded-full bg-gray-900 px-3.5 text-xs font-bold text-white shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Sparkles size={14} className="text-white" />
                <span>Итоги</span>
              </button>
            )}
          </>
        )}
      </nav>

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
            className="w-full max-h-[85vh] flex flex-col overflow-hidden rounded-t-[32px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.25)] animate-in slide-in-from-bottom-5 duration-200"
          >
            {/* Ручка свайпа */}
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-gray-300" />

            <header className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <span className="text-base font-extrabold tracking-tight text-gray-900">
                Управление и фильтры
              </span>
              <button
                type="button"
                aria-label="Закрыть"
                onClick={() => setToolsSheetOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </header>

            <div className="overflow-y-auto p-6 space-y-5 pb-10">
              {/* 1. Режим отображения: Список / Сетка */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Вид каталога
                </label>
                <div className="grid grid-cols-2 gap-1 rounded-2xl bg-gray-100 p-1">
                  <button
                    type="button"
                    onClick={() => onToggleViewMode && onToggleViewMode('list')}
                    className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all cursor-pointer ${
                      viewMode === 'list'
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <List size={14} />
                    <span>Списком</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleViewMode && onToggleViewMode('grid')}
                    className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <LayoutGrid size={14} />
                    <span>Карточками</span>
                  </button>
                </div>
              </div>

              {/* 2. Поиск книги (если в библиотеке) */}
              {page === 'library' && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Поиск по названию или автору
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Найти книгу..."
                      className="w-full h-11 rounded-2xl border border-gray-200 bg-white pl-10 pr-10 text-sm font-medium text-gray-900 outline-none focus:border-gray-900"
                    />
                    <Search
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    {searchQuery ? (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:text-gray-700 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    ) : null}
                  </div>
                </div>
              )}

              {/* 3. Фильтры каталога (только в библиотеке) */}
              {page === 'library' && (
                <>
                  {/* Жанр */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Жанр
                    </label>
                    <div className="relative">
                      <select
                        value={selectedGenre}
                        onChange={(e) => setSelectedGenre(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-3 pr-8 text-xs font-semibold text-gray-800 outline-none cursor-pointer focus:border-gray-900"
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
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                    </div>
                  </div>

                  {/* Оценка */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Оценка
                    </label>
                    <div className="relative">
                      <select
                        value={selectedRating}
                        onChange={(e) => setSelectedRating(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-3 pr-8 text-xs font-semibold text-gray-800 outline-none cursor-pointer focus:border-gray-900"
                      >
                        <option value="all">Любая оценка</option>
                        <option value="9">★ 9 и 10 (Шедевры)</option>
                        <option value="8">★ 8+ (Отличные)</option>
                        <option value="7">★ 7+ (Хорошие)</option>
                        <option value="unrated">Без оценки</option>
                      </select>
                      <ChevronDown
                        size={14}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                    </div>
                  </div>

                  {/* Формат */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Формат
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedFormat('all')}
                        className={`rounded-xl py-2 text-xs font-semibold border transition-all cursor-pointer ${
                          selectedFormat === 'all'
                            ? 'border-gray-900 bg-gray-900 text-white'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Все форматы
                      </button>
                      {FORMAT_OPTIONS.map((f) => {
                        const active = selectedFormat === f.value
                        return (
                          <button
                            key={f.value}
                            type="button"
                            onClick={() => setSelectedFormat(f.value)}
                            className={`rounded-xl py-2 text-xs font-semibold border transition-all cursor-pointer ${
                              active
                                ? 'border-gray-900 bg-gray-900 text-white'
                                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {f.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Сортировка */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Сортировка
                    </label>
                    <div className="relative">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-3 pr-8 text-xs font-semibold text-gray-800 outline-none cursor-pointer focus:border-gray-900"
                      >
                        {SORT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={14}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* 4. Экспорт / Бэкап */}
              <div className="pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setToolsSheetOpen(false)
                    onOpenBackup()
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-3 text-xs font-bold text-gray-800 hover:bg-gray-50 cursor-pointer"
                >
                  <Download size={14} />
                  <span>Резервная копия и экспорт</span>
                </button>
              </div>

              {/* 5. Кнопка сброса всех фильтров */}
              {hasAnyFilterActive && (
                <button
                  type="button"
                  onClick={() => {
                    resetExtraFilters()
                    setSearchQuery('')
                    setToolsSheetOpen(false)
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gray-100 py-3 text-xs font-bold text-gray-700 hover:bg-gray-200 cursor-pointer"
                >
                  <RotateCcw size={14} />
                  <span>Сбросить все фильтры и поиск</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
