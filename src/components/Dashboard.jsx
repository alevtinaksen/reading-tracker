import { useMemo, useState } from 'react'
import {
  BookOpen,
  Flame,
  Headphones,
  Smartphone,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react'
import { FORMAT, FORMAT_OPTIONS, MONTHS, STATUS } from '../constants'
import { YearInReviewModal } from './YearInReviewModal'

// Цель чтения на год — 36 книг
const READING_GOAL = 36

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

  // Данные активности по 12 месяцам (книги + страницы)
  const monthsData = useMemo(() => {
    return MONTHS.map((item) => {
      const monthBooks = finished.filter((book) => Number(book.readMonth) === item.value)
      const count = monthBooks.length
      const pages = monthBooks.reduce((sum, b) => sum + (Number(b.pages) || 0), 0)
      return {
        month: item.label,
        value: item.value,
        count,
        pages,
        books: monthBooks,
      }
    })
  }, [finished])

  const activityMonthCounts = useMemo(() => monthsData.map((m) => m.count), [monthsData])

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
      label: isAllYears ? 'ВСЕГО ПРОЧИТАНО' : 'ПРОЧИТАНО',
      value: totalYearCount,
      hint: isAllYears ? 'Всего прочитанных книг' : `За ${filterYear} год`,
      icon: Trophy,
    },
    {
      label: 'ПРОЧИТАНО СТРАНИЦ',
      value: totalPages > 0 ? totalPages.toLocaleString('ru-RU') : '0',
      hint: avgPagesPerBook ? `~${avgPagesPerBook} стр. в книге` : 'страницы не указаны',
      icon: BookOpen,
    },
    {
      label: 'СРЕДНЯЯ ОЦЕНКА',
      value: average,
      hint: rated.length > 0 ? `На основе ${rated.length} ${plural(rated.length, 'оценки', 'оценок', 'оценок')}` : 'нет оценок',
      icon: Star,
    },
    {
      label: 'СКОРОСТЬ ЧТЕНИЯ',
      value: readingSpeed,
      hint: pagesPerDay > 0 ? `~${pagesPerDay} стр./день` : 'книг в месяц',
      icon: TrendingUp,
    },
    {
      label: 'ПИК ЧТЕНИЯ',
      value: bestMonthName,
      hint: maxMonthCount > 0 ? `${maxMonthCount} ${plural(maxMonthCount, 'прочитанная книга', 'прочитанные книги', 'прочитанных книг')}` : 'нет активности',
      icon: Flame,
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
      {/* Заголовок Дашборд с отступами */}
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

          {/* Кнопка Итоги года в строгом статичном черном стиле */}
          <button
            type="button"
            onClick={() => setYearInReviewOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-3 text-xs font-bold text-white shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all hover:bg-gray-800 hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] active:scale-95 cursor-pointer"
          >
            <Sparkles size={14} className="text-white" />
            <span>Итоги года</span>
          </button>
        </div>
      </header>

      {/* Bento Grid со строгими отступами */}
      <div className="space-y-1 pb-16">
        {/* 1. 5 Карточек ключевых показателей */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <article
                key={stat.label}
                className="flex flex-col justify-between rounded-[20px] bg-white p-3.5 pl-5 min-h-[110px]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    {stat.label}
                  </span>
                  <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-gray-100 text-gray-800 shrink-0">
                    <Icon size={16} strokeWidth={2} />
                  </div>
                </div>

                <div className="mt-2.5">
                  <p className="text-2xl sm:text-3xl font-extrabold tracking-[-0.04em] text-gray-900 leading-none truncate">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-[11px] sm:text-xs font-medium text-gray-400 truncate">{stat.hint}</p>
                </div>
              </article>
            )
          })}
        </section>

        {/* 2. Карта активности по месяцам — 12 эстетичных интерактивных карточек */}
        <article className="flex flex-col justify-between rounded-[24px] bg-white p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-gray-100">
            <div>
              <h2 className="text-base font-bold tracking-tight text-gray-900">
                Активность по месяцам
              </h2>
              <p className="mt-0.5 text-xs text-gray-400">
                {totalYearCount} {plural(totalYearCount, 'книга', 'книги', 'книг')} {isAllYears ? 'за все время' : `за ${filterYear} год`}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold text-gray-500">
              {maxMonthCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-gray-800">
                  <Flame size={13} className="text-amber-500" />
                  <span>Пик: {peakMonthName} ({maxMonthCount} кн.)</span>
                </span>
              ) : null}
              <span className="hidden sm:inline text-gray-300">|</span>
              <span className="hidden sm:inline text-gray-400">
                Среднее: {(totalYearCount / 12).toFixed(1)} кн/мес
              </span>
            </div>
          </div>

          {/* Сетка 12 месяцев */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
            {monthsData.map((m) => {
              const isPeak = m.count > 0 && m.count === maxMonthCount
              const fillPct = maxMonthCount > 0 ? Math.round((m.count / maxMonthCount) * 100) : 0

              return (
                <div
                  key={m.value}
                  className={`group relative flex flex-col justify-between rounded-2xl p-4 transition-all duration-200 border ${
                    isPeak
                      ? 'border-gray-900 bg-gray-900 text-white shadow-xs'
                      : m.count > 0
                        ? 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-xs text-gray-900'
                        : 'border-transparent bg-gray-50/60 text-gray-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isPeak ? 'text-white' : m.count > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                      {m.month}
                    </span>
                    {isPeak ? (
                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 text-white px-1.5 py-0.5 rounded-md">
                        Топ
                      </span>
                    ) : null}
                  </div>

                  <div className="my-2">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-2xl font-black tracking-tight leading-none ${isPeak ? 'text-white' : m.count > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                        {m.count}
                      </span>
                      <span className={`text-[11px] font-medium ${isPeak ? 'text-white/70' : m.count > 0 ? 'text-gray-400' : 'text-gray-300'}`}>
                        {m.count > 0 ? plural(m.count, 'кн.', 'кн.', 'кн.') : 'книг'}
                      </span>
                    </div>
                    {m.pages > 0 ? (
                      <p className={`mt-0.5 text-[10px] font-medium truncate ${isPeak ? 'text-white/60' : 'text-gray-400'}`}>
                        {m.pages.toLocaleString('ru-RU')} стр.
                      </p>
                    ) : null}
                  </div>

                  {/* Индикатор активности */}
                  <div className={`h-1.5 w-full rounded-full overflow-hidden ${isPeak ? 'bg-white/20' : 'bg-gray-100'}`}>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isPeak ? 'bg-white' : 'bg-gray-900'}`}
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </article>

        {/* 3. Ряд 3: «Цель чтения» + «Форматы» на одном уровне */}
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

          {/* Карточка 2: Форматы */}
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
        </section>

        {/* 4. Ряд 4: «Жанры и теги» + «Любимые авторы» */}
        <section className="grid grid-cols-1 gap-1 md:grid-cols-2">
          {/* Карточка 1: Жанры и теги */}
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

          {/* Карточка 2: Любимые авторы */}
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

            <div className="mt-6 space-y-2.5">
              {topAuthors.slice(0, 3).map((item, idx) => {
                const ratingShade = getRatingShade(item.avgRating)

                return (
                  <div
                    key={item.author}
                    className="flex items-center justify-between rounded-xl bg-gray-50/80 px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-900 text-[11px] font-extrabold text-white">
                        {item.count}
                      </span>
                      <p className="truncate text-xs font-bold text-gray-900">{item.author}</p>
                    </div>

                    {item.avgRating ? (
                      <span className={`inline-flex items-center gap-1 text-xs font-bold ${ratingShade.text} shrink-0`}>
                        <Star size={11} className={ratingShade.star} />
                        <span>{item.avgRating}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-400 shrink-0">Без оценки</span>
                    )}
                  </div>
                )
              })}
              {topAuthors.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-4">Авторы пока не добавлены</p>
              ) : null}
            </div>
          </article>
        </section>
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
