import { useMemo, useState } from 'react'
import {
  BookOpen,
  Calendar,
  ChevronDown,
  Flame,
  Headphones,
  Smartphone,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { FORMAT, FORMAT_OPTIONS, MONTHS, STATUS } from '../constants'
import { YearInReviewModal } from './YearInReviewModal'
import { MobileBottomDock } from './MobileBottomDock'

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

export function Dashboard({ books, page = 'dashboard', onNavigate }) {
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
  const totalYearsCount = Math.max(1, availableYears.length)
  const targetGoal = isAllYears ? READING_GOAL * totalYearsCount : READING_GOAL
  const goalYearCount = totalYearCount
  const goalRemaining = Math.max(targetGoal - goalYearCount, 0)
  const goalPercent = Math.min((goalYearCount / targetGoal) * 100, 100)

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

  // 3. Топ авторы
  const topAuthors = useMemo(() => {
    const map = new Map()
    scopedBooks.forEach((book) => {
      if (!book.author) return
      const entry = map.get(book.author) ?? {
        author: book.author,
        count: 0,
        readCount: 0,
        totalRating: 0,
        ratingCount: 0,
      }
      entry.count += 1
      if (book.status === STATUS.read) {
        entry.readCount += 1
        if (Number(book.rating) > 0) {
          entry.totalRating += Number(book.rating)
          entry.ratingCount += 1
        }
      }
      map.set(book.author, entry)
    })

    return [...map.values()]
      .map((data) => ({
        author: data.author,
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
      label: 'ПРОЧИТАНО',
      value: totalYearCount,
      hint: isAllYears ? 'Всего прочитанных книг' : `За ${filterYear} год`,
      icon: Trophy,
    },
    {
      label: 'СТРАНИЦ',
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
      label: 'СРЕДНЕЕ В МЕСЯЦ',
      value: readingSpeed,
      hint: isAllYears ? 'в среднем за месяц' : 'книг в месяц',
      icon: Calendar,
    },
    {
      label: 'СКОРОСТЬ ЧТЕНИЯ',
      value: pagesPerDay > 0 ? `~${pagesPerDay}` : '0',
      hint: 'страниц в день',
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

  const rankBadgeColors = [
    'bg-gray-900 text-white',
    'bg-gray-700 text-white',
    'bg-gray-500 text-white',
  ]

  function getMonthBarColor(count, maxCount, isPeak) {
    if (isPeak) return 'bg-gray-900'
    if (!count || count === 0) return 'bg-gray-100'
    const ratio = maxCount > 0 ? count / maxCount : 0
    if (ratio >= 0.7) return 'bg-gray-800'
    if (ratio >= 0.4) return 'bg-gray-600'
    return 'bg-gray-400'
  }

  return (
    <div>
      {/* Заголовок Дашборд: компактный на мобильных, с отступами на десктопе */}
      <header className="relative z-40">
        <h1 className="pt-4 pb-3 md:pt-[120px] md:pb-[80px] text-center text-4xl font-extrabold tracking-tight text-gray-900 sm:text-6xl md:text-[64px]">
          Дашборд
        </h1>

        {/* Глобальная панель выбора года на десктопе (на мобильных вынесена в нижний док) */}
        <div className="hidden lg:flex mb-6 flex-wrap items-center justify-center gap-2.5">
          {/* Выпадающий список годов в едином размере с тегами библиотеки */}
          <div className="relative">
            <select
              value={globalYear}
              onChange={(e) => setGlobalYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="h-11 sm:h-12 appearance-none rounded-full border border-transparent bg-white pl-5 pr-11 text-[14px] font-semibold text-gray-900 outline-none transition-all hover:shadow-[0_6px_20px_rgba(0,0,0,0.07)] focus:border-gray-900 cursor-pointer"
            >
              <option value="all">Все годы</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year} год
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>

          {/* Кнопка Итоги года в едином размере с тегами */}
          {!isAllYears && (
            <button
              type="button"
              onClick={() => setYearInReviewOpen(true)}
              className="h-11 sm:h-12 inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 sm:px-6 text-[14px] font-semibold text-white transition-all hover:bg-gray-800 hover:shadow-[0_6px_20px_rgba(0,0,0,0.12)] active:scale-95 cursor-pointer"
            >
              <Sparkles size={15} className="text-white" />
              <span>Итоги года</span>
            </button>
          )}
        </div>
      </header>

      {/* Bento Grid со строгими отступами */}
      <div className="space-y-1 pb-16">
        {/* 1. 6 Карточек ключевых показателей в одном ряду */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <article
                key={stat.label}
                className="flex flex-col justify-between rounded-[20px] bg-white p-4 sm:p-4.5 min-h-[135px] sm:min-h-[142px]"
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 truncate pt-0.5">
                    {stat.label}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-800 shrink-0 -mt-0.5 -mr-0.5">
                    <Icon size={15} strokeWidth={2} />
                  </div>
                </div>

                <div>
                  <p className="text-2xl sm:text-[28px] font-extrabold tracking-[-0.04em] text-gray-900 leading-none truncate">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-gray-400 truncate leading-tight">{stat.hint}</p>
                </div>
              </article>
            )
          })}
        </section>

        {/* 2. Минималистичный график активности по месяцам */}
        <article className="flex flex-col justify-between rounded-[24px] bg-white p-6 sm:p-7">
          <div>
            <h2 className="text-base font-bold tracking-tight text-gray-900 leading-tight">
              Активность по месяцам
            </h2>
            <p className="mt-0.5 text-xs text-gray-400 leading-tight">
              {totalYearCount} {plural(totalYearCount, 'книга', 'книги', 'книг')} {isAllYears ? 'за все время' : `за ${filterYear} год`}
            </p>
          </div>

          {/* 12-колоночная визуализация динамики */}
          <div className="mt-8 grid grid-cols-12 gap-1.5 sm:gap-3 items-end h-56 sm:h-64 px-1 select-none">
            {monthsData.map((m) => {
              const isPeak = m.count > 0 && m.count === maxMonthCount
              const heightPct = maxMonthCount > 0 ? Math.max(10, Math.round((m.count / maxMonthCount) * 100)) : 4
              const barColor = getMonthBarColor(m.count, maxMonthCount, isPeak)

              return (
                <div key={m.value} className="flex flex-col items-center h-full justify-end">
                  {/* Число над столбиком */}
                  <div className="mb-2">
                    {isPeak ? (
                      <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-gray-900 px-1.5 text-[10px] font-black text-white shadow-xs">
                        {m.count}
                      </span>
                    ) : m.count > 0 ? (
                      <span className="text-xs font-black text-gray-900">
                        {m.count}
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-gray-300">
                        0
                      </span>
                    )}
                  </div>

                  {/* Вертикальный бар */}
                  <div className="w-full flex justify-center items-end flex-1">
                    <div
                      style={{ height: m.count > 0 ? `${heightPct}%` : '6px' }}
                      className={`w-full max-w-[28px] sm:max-w-[42px] rounded-2xl ${barColor}`}
                    />
                  </div>

                  {/* Подпись месяца и страниц */}
                  <div className="mt-3 text-center">
                    <p className={`text-[11px] sm:text-xs font-bold leading-tight ${isPeak ? 'text-gray-900 font-extrabold' : m.count > 0 ? 'text-gray-700' : 'text-gray-400'}`}>
                      {m.month.slice(0, 3)}
                    </p>
                    <p className="mt-0.5 text-[10px] font-medium text-gray-400 truncate max-w-[42px] sm:max-w-[52px] leading-tight">
                      {m.pages > 0 ? (m.pages >= 1000 ? `${(m.pages / 1000).toFixed(1)}k` : m.pages) : '—'}
                    </p>
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
            <div>
              <h2 className="text-base font-bold tracking-tight text-gray-900 leading-tight">Цель чтения</h2>
              <p className="mt-0.5 text-xs text-gray-400 leading-tight">
                {isAllYears
                  ? goalRemaining === 0
                    ? 'Цель за все годы выполнена! 🎉'
                    : `Цель за ${totalYearsCount} ${plural(totalYearsCount, 'год', 'года', 'лет')} (${READING_GOAL} кн/год)`
                  : goalRemaining === 0
                    ? 'Цель выполнена! Поздравляем!'
                    : `Осталось прочитать: ${goalRemaining} ${plural(goalRemaining, 'книга', 'книги', 'книг')}`}
              </p>
            </div>

            <div className="mt-6">
              <div className="flex items-baseline justify-between">
                <span className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
                  {goalYearCount}{' '}
                  <span className="text-xl font-bold text-gray-400 sm:text-2xl">
                    / {targetGoal}
                  </span>
                </span>
                <span className="text-base font-bold text-gray-500">{Math.round(goalPercent)}%</span>
              </div>

              {/* Прогресс-бар цели */}
              <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gray-900 transition-all duration-500 ease-out"
                  style={{ width: `${goalPercent}%` }}
                />
              </div>
            </div>
          </article>

          {/* Карточка 2: Форматы */}
          <article className="flex flex-col justify-between rounded-[24px] bg-white p-6 sm:p-7">
            <div>
              <h2 className="text-base font-bold tracking-tight text-gray-900 leading-tight">Форматы</h2>
              <p className="mt-0.5 text-xs text-gray-400 leading-tight">Распределение по типам книг</p>
            </div>

            <div className="mt-6 space-y-3.5">
              {formatCounts.map((item) => {
                const pct = totalRead > 0 ? (item.count / totalRead) * 100 : 0
                const Icon = formatIcons[item.value]
                
                return (
                  <div key={item.value} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-bold text-gray-800">
                        <Icon size={14} className="text-gray-500" />
                        <span>{item.label}</span>
                      </div>
                      <span className="font-semibold text-gray-400">
                        {item.count} ({Math.round(pct)}%)
                      </span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${formatShades[item.value]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </article>
        </section>

        {/* 4. Ряд 4: «Популярные жанры» + «Любимые авторы» */}
        <section className="grid grid-cols-1 gap-1 md:grid-cols-2">
          {/* Карточка 1: Популярные жанры */}
          <article className="flex flex-col justify-between rounded-[24px] bg-white p-6 sm:p-7">
            <div>
              <h2 className="text-base font-bold tracking-tight text-gray-900 leading-tight">Популярные жанры</h2>
              <p className="mt-0.5 text-xs text-gray-400 leading-tight">Топ тематик в вашей библиотеке</p>
            </div>

            <div className="mt-6 space-y-2.5">
              {genres.slice(0, 3).map(([tag, count], idx) => {
                const fillPercent = Math.round((count / maxGenre) * 100)

                return (
                  <div
                    key={tag}
                    className="flex items-center justify-between rounded-xl bg-gray-50/80 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-extrabold ${rankBadgeColors[idx] || 'bg-gray-200 text-gray-700'}`}>
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-gray-900">{tag}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-gray-200 sm:block">
                        <div
                          className="h-full rounded-full bg-gray-900"
                          style={{ width: `${fillPercent}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-700">
                        {count} {plural(count, 'книга', 'книги', 'книг')}
                      </span>
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
            <div>
              <h2 className="text-base font-bold tracking-tight text-gray-900 leading-tight">Любимые авторы</h2>
              <p className="mt-0.5 text-xs text-gray-400 leading-tight">Авторы с наибольшим количеством книг</p>
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
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${rankBadgeColors[idx] || 'bg-gray-200 text-gray-700'}`}>
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

      {/* Мобильный нижний док с переключением годов и итогами года */}
      <MobileBottomDock
        page={page}
        onNavigate={onNavigate}
        statusFilter="all"
        onStatusFilter={() => onNavigate && onNavigate('library')}
        counts={{ all: books.length }}
        onAdd={() => onNavigate && onNavigate('library')}
        globalYear={globalYear}
        setGlobalYear={setGlobalYear}
        availableYears={availableYears}
        onOpenYearInReview={() => setYearInReviewOpen(true)}
      />
    </div>
  )
}
