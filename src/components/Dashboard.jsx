import { useMemo, useState } from 'react'
import {
  BookOpen,
  Flame,
  Headphones,
  Layers,
  Smartphone,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import { FORMAT, FORMAT_OPTIONS, MONTHS, STATUS } from '../constants'
import { YearInReviewModal } from './YearInReviewModal'

// Цель чтения на год — 12 книг
const READING_GOAL = 12

function plural(n, one, few, many) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

function getRatingShade(rating) {
  const num = Number(rating)
  if (!num) return { text: 'text-gray-400', bar: 'bg-gray-300', star: 'fill-gray-300 text-gray-300' }
  if (num >= 9.0) return { text: 'text-gray-900', bar: 'bg-gray-900', star: 'fill-gray-900 text-gray-900' }
  if (num >= 8.0) return { text: 'text-gray-800', bar: 'bg-gray-700', star: 'fill-gray-700 text-gray-700' }
  if (num >= 7.0) return { text: 'text-gray-600', bar: 'bg-gray-500', star: 'fill-gray-500 text-gray-500' }
  return { text: 'text-gray-400', bar: 'bg-gray-400', star: 'fill-gray-400 text-gray-400' }
}

// Генератор гладкой кривой Безье для графика активности
function generateSmoothCurve(values, width = 1000, height = 220, padX = 40, padY = 35) {
  const max = Math.max(...values, 1)
  const innerW = width - padX * 2
  const innerH = height - padY * 2

  const coords = values.map((val, idx) => ({
    x: padX + (idx / (values.length - 1)) * innerW,
    y: padY + (1 - val / max) * innerH,
    val,
  }))

  let linePath = `M ${coords[0].x} ${coords[0].y}`
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i]
    const p1 = coords[i + 1]
    const midX = (p0.x + p1.x) / 2
    linePath += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`
  }

  const groundY = height - 5
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${groundY} L ${coords[0].x} ${groundY} Z`

  return { linePath, areaPath, coords, max }
}

export function Dashboard({ books }) {
  const now = useMemo(() => new Date(), [])
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const availableYears = useMemo(() => {
    const set = new Set(books.map((b) => Number(b.readYear)).filter(Boolean))
    set.add(currentYear)
    return [...set].sort((a, b) => b - a)
  }, [books, currentYear])

  // Глобальный выбранный год для всего дашборда
  const [globalYear, setGlobalYear] = useState(currentYear)
  const [yearInReviewOpen, setYearInReviewOpen] = useState(false)

  const isAllYears = globalYear === 'all'
  const filterYear = isAllYears ? null : Number(globalYear)

  // Отфильтрованные прочитанные книги под выбранный срез
  const finished = useMemo(
    () =>
      books.filter((book) => {
        if (book.status !== STATUS.read) return false
        if (filterYear) return Number(book.readYear) === filterYear
        return true
      }),
    [books, filterYear],
  )

  // Все книги под выбранный срез (для жанров и авторов)
  const scopedBooks = useMemo(
    () =>
      books.filter((book) => {
        if (filterYear) return Number(book.readYear) === filterYear || !book.readYear
        return true
      }),
    [books, filterYear],
  )

  const totalYearCount = finished.length

  // Подсчёт страниц
  const totalPages = useMemo(
    () => finished.reduce((sum, b) => sum + (Number(b.pages) || 0), 0),
    [finished],
  )
  const booksWithPages = useMemo(() => finished.filter((b) => Number(b.pages) > 0), [finished])
  const avgPagesPerBook =
    booksWithPages.length > 0 ? Math.round(totalPages / booksWithPages.length) : null

  // Средняя оценка
  const rated = finished.filter((book) => Number(book.rating) > 0)
  const average =
    rated.length === 0
      ? '—'
      : (rated.reduce((sum, book) => sum + Number(book.rating), 0) / rated.length).toFixed(1)

  // График активности по 12 месяцам
  const activityMonthCounts = useMemo(() => {
    return MONTHS.map(
      (item) =>
        finished.filter((book) => Number(book.readMonth) === item.value).length,
    )
  }, [finished])

  const curveData = useMemo(
    () => generateSmoothCurve(activityMonthCounts),
    [activityMonthCounts],
  )

  // Цель чтения
  const goalYearCount = totalYearCount
  const goalRemaining = Math.max(READING_GOAL - goalYearCount, 0)
  const goalPercent = Math.min((goalYearCount / READING_GOAL) * 100, 100)

  // 1. Форматы
  const formatCounts = useMemo(
    () =>
      FORMAT_OPTIONS.map((option) => ({
        ...option,
        count: finished.filter((book) => book.format === option.value).length,
      })),
    [finished],
  )
  const totalRead = finished.length

  // 2. Жанры и теги (Топ 3)
  const genreMap = useMemo(() => {
    const map = new Map()
    scopedBooks.forEach((book) => {
      book.tags?.forEach((tag) => {
        map.set(tag, (map.get(tag) ?? 0) + 1)
      })
    })
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [scopedBooks])

  const genres = genreMap
  const maxGenre = genres[0]?.[1] ?? 1

  // 3. Топ авторов
  const topAuthors = useMemo(() => {
    const map = new Map()
    scopedBooks.forEach((book) => {
      if (!book.author) return
      const entry = map.get(book.author) || { count: 0, readCount: 0, totalRating: 0, ratingCount: 0 }
      entry.count += 1
      if (book.status === STATUS.read) entry.readCount += 1
      if (Number(book.rating) > 0) {
        entry.totalRating += Number(book.rating)
        entry.ratingCount += 1
      }
      map.set(book.author, entry)
    })

    return [...map.entries()]
      .map(([author, data]) => ({
        author,
        count: data.count,
        readCount: data.readCount,
        avgRating: data.ratingCount > 0 ? (data.totalRating / data.ratingCount).toFixed(1) : null,
      }))
      .sort((a, b) => b.count - a.count || (Number(b.avgRating) || 0) - (Number(a.avgRating) || 0))
      .slice(0, 5)
  }, [scopedBooks])

  // 4. Книжный темп и рекорды
  const maxMonthCount = Math.max(...activityMonthCounts, 0)
  const bestMonthIdx = activityMonthCounts.indexOf(maxMonthCount)
  const bestMonthName = maxMonthCount > 0 && bestMonthIdx >= 0 ? MONTHS[bestMonthIdx]?.label : '—'

  const monthsDivisor = filterYear === currentYear ? Math.max(1, currentMonth) : 12
  const readingSpeed = (totalYearCount / monthsDivisor).toFixed(1)
  const pagesPerDay = totalPages > 0 ? Math.round(totalPages / (monthsDivisor * 30.5)) : 0

  const stats = [
    {
      label: isAllYears ? 'ВСЕГО ПРОЧИТАНО' : `ЗА ${filterYear} ГОД`,
      value: totalYearCount,
      hint: `${totalYearCount} ${plural(totalYearCount, 'книга', 'книги', 'книг')}`,
      icon: Trophy,
    },
    {
      label: 'ПРОЧИТАНО СТРАНИЦ',
      value: totalPages > 0 ? totalPages.toLocaleString('ru-RU') : '—',
      hint: avgPagesPerBook ? `~${avgPagesPerBook} стр. в книге` : 'добавляйте страницы к книгам',
      icon: BookOpen,
    },
    {
      label: 'СРЕДНЯЯ ОЦЕНКА',
      value: average,
      hint: `${rated.length} ${plural(rated.length, 'оценка', 'оценки', 'оценок')}`,
      icon: Star,
    },
    {
      label: 'ВСЕГО В КАТАЛОГЕ',
      value: books.length,
      hint: `${books.filter((b) => b.status === STATUS.read).length} прочитано за все время`,
      icon: Layers,
    },
  ]

  const formatShades = {
    [FORMAT.paper]: 'bg-gray-900',
    [FORMAT.audio]: 'bg-gray-600',
    [FORMAT.ebook]: 'bg-gray-400',
  }

  const formatIcons = {
    [FORMAT.paper]: BookOpen,
    [FORMAT.audio]: Headphones,
    [FORMAT.ebook]: Smartphone,
  }

  return (
    <div>
      {/* Заголовок Дашборд с отступами: 120px сверху, 80px снизу */}
      <header className="relative z-40">
        <h1 className="pt-[120px] pb-[80px] text-center text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl md:text-[64px]">
          Дашборд
        </h1>

        {/* Глобальная панель переключения среза года и кнопка "Итоги года" */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2.5">
          {/* Переключатель годов */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-gray-100/90 bg-white p-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <button
              type="button"
              onClick={() => setGlobalYear('all')}
              className={`rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                isAllYears
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Все годы
            </button>
            {availableYears.map((year) => {
              const active = globalYear === year
              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => setGlobalYear(year)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-gray-900 text-white shadow-xs'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {year}
                </button>
              )
            })}
          </div>

          {/* Кнопка Итоги года */}
          <button
            type="button"
            onClick={() => setYearInReviewOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-gray-100/90 bg-white px-5 py-3 text-xs font-bold text-gray-900 shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all hover:bg-gray-900 hover:text-white hover:shadow-[0_8px_30px_rgba(0,0,0,0.10)] active:scale-95 cursor-pointer"
          >
            <Sparkles size={14} className="text-amber-500" />
            <span>Итоги года</span>
          </button>
        </div>
      </header>

      {/* Bento Grid со строгими отступами 4px */}
      <div className="space-y-1 pb-16">
        {/* 1. 4 Карточки ключевых показателей: отступ слева строго 20px (pl-5), остальные 12px (p-3) */}
        <section className="grid grid-cols-2 gap-1 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <article
                key={stat.label}
                className="flex flex-col justify-between rounded-[20px] bg-white p-3 pl-5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    {stat.label}
                  </span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-800 shrink-0">
                    <Icon size={18} strokeWidth={2} />
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-4xl font-extrabold tracking-[-0.04em] text-gray-900 sm:text-5xl leading-none">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs font-medium text-gray-400">{stat.hint}</p>
                </div>
              </article>
            )
          })}
        </section>

        {/* 2. График «Активность по месяцам» на весь ряд с плавной адаптацией */}
        <article className="flex flex-col justify-between rounded-[24px] bg-white p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold tracking-tight text-gray-900">
                Активность по месяцам
              </h2>
              <p className="mt-0.5 text-xs text-gray-400">
                {totalYearCount} {plural(totalYearCount, 'книга', 'книги', 'книг')} {isAllYears ? 'за все время' : `за ${filterYear} год`}
              </p>
            </div>
          </div>

          {/* SVG График с гладкой волной Безье */}
          <div className="mt-5 w-full overflow-x-auto">
            <div className="min-w-[580px] sm:min-w-full">
              <div className="relative h-[220px] w-full">
                <svg
                  viewBox="0 0 1000 220"
                  className="h-full w-full overflow-visible"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#111827" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="#111827" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Горизонтальные сетки */}
                  <line
                    x1="40"
                    y1="35"
                    x2="960"
                    y2="35"
                    stroke="#F3F4F6"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <line
                    x1="40"
                    y1="110"
                    x2="960"
                    y2="110"
                    stroke="#F3F4F6"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <line x1="40" y1="185" x2="960" y2="185" stroke="#F3F4F6" strokeWidth="1" />

                  {/* Заливка области под графиком */}
                  <path d={curveData.areaPath} fill="url(#areaGradient)" />

                  {/* Плавная линия графика */}
                  <path
                    d={curveData.linePath}
                    fill="none"
                    stroke="#111827"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Интерактивные точки со значениями */}
                  {curveData.coords.map((pt, idx) => {
                    const isPeak = pt.val > 0 && pt.val === curveData.max
                    return (
                      <g key={idx} className="group cursor-pointer">
                        {/* Невидимая область для легкого ховера */}
                        <circle cx={pt.x} cy={pt.y} r="18" fill="transparent" />

                        {/* Точка */}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isPeak ? 5.5 : 4}
                          className={`transition-all duration-200 ${
                            isPeak
                              ? 'fill-gray-900 stroke-white stroke-[2.5px]'
                              : pt.val > 0
                                ? 'fill-gray-800'
                                : 'fill-gray-300'
                          } group-hover:scale-125 group-hover:fill-gray-900`}
                        />

                        {/* Значение над точкой при наличии книг */}
                        {pt.val > 0 ? (
                          <text
                            x={pt.x}
                            y={pt.y - 12}
                            textAnchor="middle"
                            className="fill-gray-900 text-[12px] font-bold select-none"
                          >
                            {pt.val}
                          </text>
                        ) : null}
                      </g>
                    )
                  })}
                </svg>
              </div>

              {/* Названия месяцев под графиком */}
              <div className="mt-2 flex justify-between px-6 text-[11px] font-semibold text-gray-400">
                {MONTHS.map((m) => (
                  <span key={m.value} className="text-center">
                    {m.label.slice(0, 3)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </article>

        {/* 3. Ряд 3: «Цель чтения» + «Книжный темп» на одном уровне */}
        <section className="grid grid-cols-1 gap-1 md:grid-cols-2">
          {/* Карточка 1: Цель чтения */}
          <article className="flex flex-col justify-between rounded-[24px] bg-white p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold tracking-tight text-gray-900">Цель чтения</h2>
                <p className="mt-0.5 text-xs text-gray-400">
                  {goalRemaining === 0
                    ? 'Цель выполнена! Поздравляем!'
                    : `Осталось прочитать: ${goalRemaining} ${plural(goalRemaining, 'книга', 'книги', 'книг')}`}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-baseline justify-between">
                <span className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
                  {goalYearCount}{' '}
                  <span className="text-xl font-bold text-gray-400 sm:text-2xl">
                    / {READING_GOAL}
                  </span>
                </span>
                <span className="text-sm font-extrabold text-gray-900">
                  {Math.round(goalPercent)}%
                </span>
              </div>

              <div className="mt-3.5 h-3.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gray-900 transition-all duration-700 ease-out"
                  style={{ width: `${goalPercent}%` }}
                />
              </div>
            </div>
          </article>

          {/* Карточка 2: Книжный темп и страницы */}
          <article className="flex flex-col justify-between rounded-[24px] bg-white p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold tracking-tight text-gray-900">Книжный темп</h2>
                <p className="mt-0.5 text-xs text-gray-400">Динамика и рекорды чтения</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-800 shrink-0">
                <Zap size={18} />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-gray-50/80 p-3.5">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Flame size={14} className="text-gray-800" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Пик года
                  </span>
                </div>
                <p className="mt-2 text-xl font-extrabold text-gray-900">{bestMonthName}</p>
                <p className="mt-0.5 text-xs font-medium text-gray-400">
                  {maxMonthCount} {plural(maxMonthCount, 'книга', 'книги', 'книг')}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50/80 p-3.5">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <TrendingUp size={14} className="text-gray-800" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Скорость
                  </span>
                </div>
                <p className="mt-2 text-xl font-extrabold text-gray-900">{readingSpeed}</p>
                <p className="mt-0.5 text-xs font-medium text-gray-400">
                  {pagesPerDay > 0 ? `~${pagesPerDay} стр./день` : 'книг в месяц'}
                </p>
              </div>
            </div>
          </article>
        </section>

        {/* 4. Ряд 4: «Форматы» + «Жанры и теги» на одном уровне */}
        <section className="grid grid-cols-1 gap-1 md:grid-cols-2">
          {/* Карточка 1: Форматы */}
          <article className="flex flex-col justify-between rounded-[24px] bg-white p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold tracking-tight text-gray-900">Форматы</h2>
                <p className="mt-0.5 text-xs text-gray-400">
                  Распределение прочитанных книг по типам
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
                {formatCounts.map((item) => {
                  const pct = totalRead > 0 ? (item.count / totalRead) * 100 : 0
                  if (pct === 0) return null
                  return (
                    <div
                      key={item.value}
                      className={`h-full transition-all duration-500 ${formatShades[item.value]}`}
                      style={{ width: `${pct}%` }}
                      title={`${item.label}: ${item.count}`}
                    />
                  )
                })}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {formatCounts.map((item) => {
                  const Icon = formatIcons[item.value]
                  return (
                    <div key={item.value} className="rounded-xl bg-gray-50/80 p-3">
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <Icon size={14} className="text-gray-700" />
                        <span className="text-[11px] font-semibold text-gray-500 truncate">
                          {item.label}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xl font-bold text-gray-900">{item.count}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </article>

          {/* Карточка 2: Жанры и теги (Только первые 3 жанра, без белых кружков) */}
          <article className="flex flex-col justify-between rounded-[24px] bg-white p-6 sm:p-7">
            <div>
              <h2 className="text-base font-bold tracking-tight text-gray-900">Жанры и теги</h2>
              <p className="mt-0.5 text-xs text-gray-400">Топ-3 ведущих направления</p>
            </div>

            <div className="mt-6 space-y-3.5">
              {genres.slice(0, 3).map(([tag, count]) => {
                const percent = Math.round((count / maxGenre) * 100)
                return (
                  <div key={tag} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                      <span>{tag}</span>
                      <span className="text-xs font-extrabold text-gray-900">{count}</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gray-900 transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {genres.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-4">Жанры пока не добавлены</p>
              ) : null}
            </div>
          </article>
        </section>

        {/* 5. Ряд 5: «Любимые авторы» на всю ширину */}
        <article className="flex flex-col justify-between rounded-[24px] bg-white p-6 sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold tracking-tight text-gray-900">Любимые авторы</h2>
              <p className="mt-0.5 text-xs text-gray-400">Авторы с наибольшим количеством книг</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-800 shrink-0">
              <Users size={18} />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {topAuthors.map((item, idx) => {
              const ratingShade = getRatingShade(item.avgRating)
              const ratingVal = Number(item.avgRating) || 0
              const ratingBarPercent = Math.min((ratingVal / 10) * 100, 100)

              return (
                <div
                  key={item.author}
                  className="flex flex-col justify-between rounded-2xl bg-gray-50/80 p-4 transition-all hover:bg-gray-100/80"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-900 text-[11px] font-extrabold text-white">
                      {item.count}
                    </span>
                    <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                  </div>

                  <div className="mt-3">
                    <h3 className="line-clamp-1 text-sm font-bold text-gray-900" title={item.author}>
                      {item.author}
                    </h3>

                    {item.avgRating ? (
                      <div className="mt-2.5 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-gray-400">Рейтинг</span>
                          <span className={`inline-flex items-center gap-0.5 ${ratingShade.text}`}>
                            <Star size={11} className={ratingShade.star} />
                            <span>{item.avgRating}</span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${ratingShade.bar}`}
                            style={{ width: `${ratingBarPercent}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 text-[11px] text-gray-400">Без оценки</p>
                    )}
                  </div>
                </div>
              )
            })}
            {topAuthors.length === 0 ? (
              <p className="col-span-full text-center text-xs text-gray-400 py-4">
                Авторы пока не добавлены
              </p>
            ) : null}
          </div>
        </article>
      </div>

      {/* Модальное окно постера «Итоги года» */}
      {yearInReviewOpen ? (
        <YearInReviewModal
          books={books}
          defaultYear={isAllYears ? currentYear : filterYear}
          onClose={() => setYearInReviewOpen(false)}
        />
      ) : null}
    </div>
  )
}
